"""
The live bridge tells the viewer how to point its camera automatically.
"""

from __future__ import annotations

import json
from dataclasses import asdict

import pytest

from cramera.camera import AutomaticCamera, Viewpoint
from cramera.config import CrameraConfig
from cramera.live.bridge import Bridge
from cramera.live.http import serve

from .test_server import get_json


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
