from unittest.mock import patch

from coraplex.ros.no_ros import ros_tools

# %% sleeping without ROS


def test_sleep_waits_for_the_given_duration():
    duration = 0.25
    with patch("time.sleep") as time_sleep:
        ros_tools.sleep(duration)
    time_sleep.assert_called_once_with(duration)
