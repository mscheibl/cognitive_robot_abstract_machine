from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID, uuid4

from typing_extensions import Callable

from coraplex.plans.executables import Executable
from coraplex.plans.factories import execute_single
from coraplex.plans.failures import PlanFailure
from coraplex.plans.plan_node import ExecutionBoundaryNode, PlanNode
from coraplex.robot_plans.actions.base import ActionDescription
from semantic_digital_twin.world import World

# %% mimics for testing candidate trials without depending on real motion physics


@dataclass
class TrialCall:
    """
    One recorded attempt of a `RecordingAction`.
    """

    world: World
    """
    The world the attempt actually ran against, so a test can tell a trial copy
    from the real world by identity.
    """

    position_at_entry: float
    """
    The value of the probed degree of freedom when this attempt started, so a test can
    tell whether a later trial copy reflects an earlier real failure's state.
    """


class TrialProbe:
    """
    Records every attempt of a `RecordingAction` across both trial and real execution.
    """

    def __init__(self):
        self.calls: list[TrialCall] = []


_registered_probes: dict[UUID, TrialProbe] = {}
"""
`TrialProbe` instances, keyed by the id a `RecordingAction` carries as `probe_key`.

`World.rebind_world_entities` deep-copies every value it does not recognize as a world entity, so a
rebound `RecordingAction` cannot share a probe handed to it directly as a field - the
same isolation that makes a trial safe for real designators. Reaching the probe
out-of-band by an id, whose value survives copying even though its identity need not,
is what lets a test observe a candidate's trial and its later real attempt as one
sequence.
"""


def register_probe() -> UUID:
    """
    Register a fresh `TrialProbe` and return the id a `RecordingAction` should carry to
    record into it.
    """
    key = uuid4()
    _registered_probes[key] = TrialProbe()
    return key


@dataclass(eq=False, repr=False)
class RecordingExecutionNode(ExecutionBoundaryNode):
    """
    A leaf plan node whose parsed executable records the world it ran against and
    mutates a probed degree of freedom, failing once a configured number of attempts
    have been recorded.
    """

    probe_key: UUID = field(kw_only=True)
    """
    Id of the `TrialProbe` this node's attempts are recorded to.
    """

    dof_id: UUID = field(kw_only=True)
    """
    Id of the degree of freedom this node mutates on every attempt, to make world state
    changes observable.
    """

    fail_on_attempt_number: int | None = field(kw_only=True, default=None)
    """
    Report :attr:`reported_failure` once the probe has recorded this many calls; never
    fail if None.
    """

    reported_failure: Callable[[], Exception] = field(kw_only=True, default=PlanFailure)
    """
    Builds the failure a failing attempt reports.
    """

    def notify(self):
        pass

    def parse(self) -> Executable:
        return RecordingExecutable(
            context=self.context,
            probe_key=self.probe_key,
            dof_id=self.dof_id,
            fail_on_attempt_number=self.fail_on_attempt_number,
            reported_failure=self.reported_failure,
        )


@dataclass
class RecordingExecutable(Executable):
    """
    Executable half of `RecordingExecutionNode`; see its docstring.
    """

    probe_key: UUID = field(kw_only=True)
    dof_id: UUID = field(kw_only=True)
    fail_on_attempt_number: int | None = field(kw_only=True)
    reported_failure: Callable[[], Exception] = field(kw_only=True, default=PlanFailure)

    def execute(self) -> None:
        probe = _registered_probes[self.probe_key]
        probe.calls.append(
            TrialCall(
                world=self.context.world,
                position_at_entry=self.context.world.state[self.dof_id].position,
            )
        )
        self.context.world.state[self.dof_id].position = len(probe.calls)
        self.context.world.notify_state_change()
        if len(probe.calls) == self.fail_on_attempt_number:
            raise self.reported_failure()


@dataclass
class RecordingAction(ActionDescription):
    """
    An action whose execution deterministically records itself and can be made to fail
    on a specific attempt, for testing `UnderspecifiedNode`'s trial-then-real candidate
    handling without depending on real motion physics.
    """

    probe_key: UUID = field(kw_only=True)
    dof_id: UUID = field(kw_only=True)
    fail_on_attempt_number: int | None = field(kw_only=True, default=None)
    reported_failure: Callable[[], Exception] = field(kw_only=True, default=PlanFailure)

    @property
    def _action_plan(self) -> PlanNode:
        return execute_single(
            RecordingExecutionNode(
                probe_key=self.probe_key,
                dof_id=self.dof_id,
                fail_on_attempt_number=self.fail_on_attempt_number,
                reported_failure=self.reported_failure,
            )
        )
