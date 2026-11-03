"""
The live bridge tells the viewer how to point its camera automatically.
"""

from __future__ import annotations

import json
from dataclasses import asdict

import pytest

from cramera.camera import AutomaticCamera, CalibrationMark, ShownCamera, Viewpoint
from cramera.config import CrameraConfig
from cramera.live.bridge import Bridge
from cramera.live.http import serve

from .test_server import get_json, post


# %% fixtures


@pytest.fixture()
def automatic_camera() -> AutomaticCamera:
    return AutomaticCamera(
        overview=Viewpoint(position=(4.0, -2.0, 2.5), target=(2.0, 1.0, 0.8))
    )


def served_camera(bridge: Bridge) -> dict:
    """
    :param bridge: The bridge to serve on an ephemeral port.
    :return: The decoded answer of its camera endpoint.
    """
    server = serve(bridge, 0)
    try:
        return get_json("http://localhost:%d/camera" % server.server_address[1])
    finally:
        server.shutdown()


# %% camera endpoint


def test_a_bridge_without_an_automatic_camera_serves_none() -> None:
    assert served_camera(Bridge()) == {"camera": None}


def test_a_configured_automatic_camera_is_served_as_plain_numbers(
    automatic_camera: AutomaticCamera,
) -> None:
    bridge = Bridge(configuration=CrameraConfig(automatic_camera=automatic_camera))

    assert served_camera(bridge) == {
        "camera": json.loads(json.dumps(asdict(automatic_camera)))
    }


# %% the camera the page shows


def shown_camera(shown_at_epoch_ms: int, x: float) -> ShownCamera:
    """
    :param shown_at_epoch_ms: When the page started showing it.
    :param x: Where along x it stands.
    :return: A camera the page reports it shows.
    """
    return ShownCamera(
        viewpoint=Viewpoint(position=(x, 0.0, 2.0), target=(x, 3.0, 0.5)),
        vertical_field_of_view=45.0,
        aspect_ratio=16 / 9,
        shown_at_epoch_ms=shown_at_epoch_ms,
    )


def report(bridge: Bridge, payloads: list[dict]) -> list[int]:
    """
    :param bridge: The bridge to serve on an ephemeral port.
    :param payloads: What the page reports, in order.
    :return: The status of each report.
    """
    server = serve(bridge, 0)
    url = "http://localhost:%d/camera/shown" % server.server_address[1]
    try:
        return [post(url, payload)[0] for payload in payloads]
    finally:
        server.shutdown()


def test_a_reported_camera_is_the_one_shown_from_its_time_on() -> None:
    bridge = Bridge()
    first, second = shown_camera(1000, 1.0), shown_camera(2000, 2.0)

    report(bridge, [asdict(first), asdict(second)])

    assert bridge.shown_camera_at(1500) == first
    assert bridge.shown_camera_at(2500) == second


def test_no_camera_was_shown_before_the_first_report() -> None:
    bridge = Bridge()

    report(bridge, [asdict(shown_camera(1000, 1.0))])

    assert bridge.shown_camera_at(500) is None


def test_a_report_that_is_no_camera_is_rejected() -> None:
    bridge = Bridge()

    assert report(bridge, [{"viewpoint": "somewhere"}]) == [400]
    assert bridge.shown_camera_at(10**13) is None


# %% calibration marks


def served_state(bridge: Bridge) -> dict:
    """
    :param bridge: The bridge to serve on an ephemeral port.
    :return: The decoded answer of its state endpoint.
    """
    server = serve(bridge, 0)
    try:
        return get_json("http://localhost:%d/state" % server.server_address[1])
    finally:
        server.shutdown()


def test_the_calibration_mark_shown_is_served_with_the_state() -> None:
    bridge = Bridge()
    mark = CalibrationMark(horizontal=0.25, vertical=0.75)

    bridge.show_calibration_mark(mark)

    assert served_state(bridge)["calibrationMark"] == asdict(mark)


def test_no_calibration_mark_is_served_once_it_is_hidden() -> None:
    bridge = Bridge()
    bridge.show_calibration_mark(CalibrationMark(horizontal=0.5, vertical=0.5))

    bridge.show_calibration_mark(None)

    assert "calibrationMark" not in served_state(bridge)
