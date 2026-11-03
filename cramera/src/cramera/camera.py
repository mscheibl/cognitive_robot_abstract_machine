"""
How the viewer points its camera on its own, for an audience watching the robot.
"""

from __future__ import annotations

from dataclasses import dataclass, field


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
