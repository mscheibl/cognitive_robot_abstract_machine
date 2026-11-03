from __future__ import annotations

import time
from dataclasses import dataclass, field

import pytest

from coraplex.datastructures.enums import MotionPacing
from coraplex.execution_environment import kinematically_simulated_robot
from coraplex.plans.factories import sequential
from coraplex.plans.underspecified import ActionTrial
from coraplex.robot_plans.actions.core.robot_body import MoveTorsoAction
from giskardpy.executor import ScheduledPacer
from semantic_digital_twin.datastructures.definitions import TorsoState


# %% scheduled pacer observation


@dataclass
class ScheduledPacerObservation:
    """
    The waits of every :class:`~giskardpy.executor.ScheduledPacer` while it is observed.
    """

    cycle_durations: list[float] = field(default_factory=list)
    """
    The cycle duration of each wait, in seconds.
    """

    control_periods: list[float] = field(default_factory=list)
    """
    The control period of the loop at each wait, in seconds.
    """

    @property
    def paced_duration(self) -> float:
        """
        :return: How long the observed waits hold a loop in total, in seconds.
        """
        return sum(self.cycle_durations)


@pytest.fixture
def real_time_pacer_observation(monkeypatch) -> ScheduledPacerObservation:
    """
    Record every wait of a pacer that holds a loop to the wall clock, which then still
    waits as it would.
    """
    observation = ScheduledPacerObservation()
    original_sleep = ScheduledPacer.sleep

    def observed_sleep(pacer: ScheduledPacer) -> None:
        observation.cycle_durations.append(pacer.cycle_duration)
        observation.control_periods.append(1 / pacer.target_frequency)
        original_sleep(pacer)

    monkeypatch.setattr(ScheduledPacer, "sleep", observed_sleep)
    return observation


def _raise_torso(context) -> float:
    """
    Raise the torso of the context's robot in kinematic simulation.

    :return: How long it took on the wall clock, in seconds.
    """
    plan = sequential(
        [MoveTorsoAction(TorsoState.LOW), MoveTorsoAction(TorsoState.HIGH)],
        context=context,
    ).plan
    start = time.monotonic()
    with kinematically_simulated_robot:
        plan.perform()
    return time.monotonic() - start


# %% pacing of kinematically simulated motions


def test_a_motion_paced_in_real_time_takes_its_control_time_on_the_wall_clock(
    pr2_apartment_context, real_time_pacer_observation
):
    _, _, context = pr2_apartment_context
    context.motion_pacing = MotionPacing.REAL_TIME

    wall_clock_duration = _raise_torso(context)

    assert real_time_pacer_observation.cycle_durations
    assert wall_clock_duration >= real_time_pacer_observation.paced_duration


def test_a_motion_runs_unpaced_by_default(
    pr2_apartment_context, real_time_pacer_observation
):
    _, _, context = pr2_apartment_context
    assert context.motion_pacing == MotionPacing.AS_FAST_AS_POSSIBLE

    _raise_torso(context)

    assert real_time_pacer_observation.cycle_durations == []


def test_a_trial_runs_unpaced_even_for_a_context_paced_in_real_time(
    pr2_apartment_context, real_time_pacer_observation
):
    _, _, context = pr2_apartment_context
    context.motion_pacing = MotionPacing.REAL_TIME
    trial = ActionTrial(context=context)

    succeeded = trial.succeeds(MoveTorsoAction(TorsoState.HIGH))

    trial.discard()
    assert succeeded
    assert real_time_pacer_observation.cycle_durations == []


# %% motions paced faster than real time


def test_a_motion_paced_in_real_time_waits_one_control_period_per_cycle_by_default(
    pr2_apartment_context, real_time_pacer_observation
):
    _, _, context = pr2_apartment_context
    context.motion_pacing = MotionPacing.REAL_TIME

    _raise_torso(context)

    assert real_time_pacer_observation.cycle_durations == pytest.approx(
        real_time_pacer_observation.control_periods
    )


def test_a_motion_paced_twice_as_fast_as_real_time_waits_half_a_control_period(
    pr2_apartment_context, real_time_pacer_observation
):
    _, _, context = pr2_apartment_context
    context.motion_pacing = MotionPacing.REAL_TIME
    context.real_time_factor = 2.0

    _raise_torso(context)

    assert real_time_pacer_observation.cycle_durations
    assert real_time_pacer_observation.cycle_durations == pytest.approx(
        [period / 2.0 for period in real_time_pacer_observation.control_periods]
    )
