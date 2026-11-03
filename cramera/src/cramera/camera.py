"""
How the viewer points its camera on its own, for an audience watching the robot.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from numbers import Real

from typing_extensions import Any


# %% camera placements


@dataclass(frozen=True)
class Viewpoint:
    """
    A camera standing still in the world.
    """

    position: tuple[float, float, float]
    """
    Where the camera stands, in world coordinates in metres.
    """

    target: tuple[float, float, float]
    """
    The point the camera looks at, in world coordinates in metres.
    """


@dataclass(frozen=True)
class RobotFacingCamera:
    """
    A camera in front of the robot that faces it, as a person across a table would, and
    comes closer where something stands in its way.
    """

    distance: float = 2.5
    """
    How far in front of the robot root the camera stands, along the robot's forward
    axis, in metres.
    """

    height: float = 1.6
    """
    How high above the robot root the camera stands, in metres.
    """

    target_height: float = 1.0
    """
    How high above the robot root the point lies that the camera looks at, in metres.
    """

    obstacle_clearance: float = 0.2
    """
    How far the camera stays from a wall or furniture that stands between it and the
    robot, in metres; the camera comes closer to the robot instead.
    """

    minimum_distance: float = 1.0
    """
    How close to the point it looks at the camera may come before the overview is shown
    instead, in metres.
    """


# %% automatic camera


@dataclass(frozen=True)
class AutomaticCamera:
    """
    A camera that shows a fixed overview while the robot's base moves and faces the
    robot once the base rests.
    """

    overview: Viewpoint
    """
    The view shown while the base moves.
    """

    robot_facing: RobotFacingCamera = field(default_factory=RobotFacingCamera)
    """
    The view shown while the base rests.
    """

    standstill_duration: float = 1.0
    """
    How long the base has to rest before the robot is faced, in seconds.
    """

    standstill_translation_tolerance: float = 0.01
    """
    How far the base may drift and still count as resting, in metres.
    """

    standstill_rotation_tolerance: float = 0.0175
    """
    How far the base may turn and still count as resting, in radians.
    """


# %% what the viewer shows


def _is_point(value: Any) -> bool:
    """
    :param value: A decoded JSON value.
    :return: Whether it is three numbers.
    """
    return (
        isinstance(value, list)
        and len(value) == 3
        and all(isinstance(number, Real) for number in value)
    )


@dataclass(frozen=True)
class ShownCamera:
    """
    The camera the viewer started to show the scene through at a moment.
    """

    viewpoint: Viewpoint
    """
    Where the camera stands and what it looks at.
    """

    vertical_field_of_view: float
    """
    The camera's vertical field of view, in degrees.
    """

    aspect_ratio: float
    """
    The width of the shown scene divided by its height.
    """

    shown_at_epoch_ms: int
    """
    When the viewer started to show the scene through this camera, in epoch
    milliseconds.
    """

    @classmethod
    def from_json(cls, payload: dict[str, Any]) -> ShownCamera | None:
        """
        :param payload: The viewer's report of the camera it shows.
        :return: The camera it describes; None when it describes none.
        """
        viewpoint = payload.get("viewpoint")
        numbers = [
            payload.get(name)
            for name in (
                "vertical_field_of_view",
                "aspect_ratio",
                "shown_at_epoch_ms",
            )
        ]
        if not isinstance(viewpoint, dict) or not all(
            isinstance(number, Real) for number in numbers
        ):
            return None
        position, target = viewpoint.get("position"), viewpoint.get("target")
        if not _is_point(position) or not _is_point(target):
            return None
        vertical_field_of_view, aspect_ratio, shown_at_epoch_ms = numbers
        return cls(
            viewpoint=Viewpoint(position=tuple(position), target=tuple(target)),
            vertical_field_of_view=float(vertical_field_of_view),
            aspect_ratio=float(aspect_ratio),
            shown_at_epoch_ms=int(shown_at_epoch_ms),
        )


@dataclass(frozen=True)
class CalibrationMark:
    """
    A mark the viewer draws over the shown scene for a person to point at.
    """

    horizontal: float
    """
    Where the mark lies across the shown scene, from 0 at its left to 1 at its right.
    """

    vertical: float
    """
    Where the mark lies down the shown scene, from 0 at its top to 1 at its bottom.
    """
