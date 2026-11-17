"""
Pacers that hold the control loop of a kinematically simulated motion to the wall clock
at the pace its CoraPlex context asks for.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from typing_extensions import TYPE_CHECKING

from giskardpy.data_types.exceptions import NonPositiveRealTimeFactorError
from giskardpy.executor import ScheduledPacer

if TYPE_CHECKING:
    from coraplex.datastructures.dataclasses import Context


# %% pacing at the context's real-time factor


@dataclass
class ContextSimulationPacer(ScheduledPacer):
    """
    Runs a loop at its target frequency times the real-time factor its context has at
    each cycle, so a factor changed while a motion runs paces the cycles after the
    change.
    """

    context: Context = field(kw_only=True)
    """
    The context whose
    :attr:`~coraplex.datastructures.dataclasses.Context.real_time_factor` sets the pace.
    """

    @property
    def cycle_duration(self) -> float:
        """
        :raises NonPositiveRealTimeFactorError: When the context's real-time factor is
            not positive.
        """
        real_time_factor = self.context.real_time_factor
        if real_time_factor <= 0:
            raise NonPositiveRealTimeFactorError(real_time_factor)
        return 1 / (self.target_frequency * real_time_factor)
