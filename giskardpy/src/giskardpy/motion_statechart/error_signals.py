from __future__ import annotations

from typing_extensions import List, Tuple

from krrood.symbolic_math.symbolic_math import Scalar, SymbolicMathType
from semantic_digital_twin.spatial_types import RotationMatrix, Vector3
from semantic_digital_twin.world_description.degree_of_freedom import (
    PositionVariable,
    VelocityVariable,
)

# %% differentiating with respect to time


def joint_position_and_velocity_variables(
    expression: SymbolicMathType,
) -> Tuple[List[PositionVariable], List[VelocityVariable]]:
    """
    Collect the joint positions `expression` depends on, paired with the velocity of the
    same degree of freedom.

    Free variables that are not joint positions are skipped, so they are treated as
    constants when differentiating. That is correct for values which only change between
    runs of a node, such as a goal captured by
    :class:`~giskardpy.motion_statechart.binding_policy.ForwardKinematicsBinding`, and
    wrong for values rewritten every control cycle.

    :param expression: The expression to inspect.
    :return: The joint position variables and their matching velocity variables.
    """
    position_variables: List[PositionVariable] = [
        variable
        for variable in expression.free_variables()
        if isinstance(variable, PositionVariable)
    ]
    velocity_variables = [
        variable.dof.variables.velocity for variable in position_variables
    ]
    return position_variables, velocity_variables


def time_derivative_from_joint_motion(expression: Scalar) -> Scalar:
    """
    Differentiate `expression` with respect to time, assuming it changes only because
    the robot's joints move.

    :param expression: The scalar expression to differentiate.
    :return: The rate of change of `expression`, in its own units per second.
    """
    position_variables, velocity_variables = joint_position_and_velocity_variables(
        expression
    )
    if not position_variables:
        return Scalar(0)
    return expression.total_derivative(position_variables, velocity_variables)[0]


def angular_velocity_from_joint_motion(frame_R_current: RotationMatrix) -> Vector3:
    """
    The angular velocity of a rotating frame about its own axes, assuming it rotates
    only because the robot's joints move.

    :param frame_R_current: The rotation of the frame. It should depend on active dofs.
    :return: The angular velocity in rad/s, expressed in the rotating frame.
    """
    position_variables, velocity_variables = joint_position_and_velocity_variables(
        frame_R_current
    )
    if not position_variables:
        return Vector3()
    x_axis, y_axis, z_axis = (frame_R_current[:3, column] for column in range(3))
    x_axis_dot, y_axis_dot, z_axis_dot = (
        axis.total_derivative(position_variables, velocity_variables)
        for axis in (x_axis, y_axis, z_axis)
    )
    return Vector3(
        x=z_axis.dot(y_axis_dot),
        y=x_axis.dot(z_axis_dot),
        z=y_axis.dot(x_axis_dot),
    )
