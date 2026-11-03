from __future__ import annotations

from abc import ABCMeta
from dataclasses import dataclass, field

from typing_extensions import Generic

from krrood.patterns.subclass_safe_generic import SubClassSafeGeneric
from krrood.utils import T


# %% metaclass that carries annotations of its own


class MetaclassWithAnnotations(ABCMeta):
    """
    A metaclass whose own dictionary holds ``__annotations__``.

    While it does, reading ``__annotations__`` on one of its classes that annotates nothing
    itself returns the annotations of the nearest base that does.
    """

    registry_label: str
    """
    An annotation of the metaclass itself.
    """


# %% generic classes built by that metaclass


@dataclass(eq=False)
class AnnotatedRoot(metaclass=MetaclassWithAnnotations):
    """
    A base that annotates a field of its own.
    """

    label: str = ""
    """
    A field declared above the generic base.
    """


@dataclass(eq=False)
class GenericItemHolder(Generic[T], SubClassSafeGeneric, AnnotatedRoot):
    """
    A generic class whose field is narrowed when a subclass binds its parameter.
    """

    items: list[T] = field(default_factory=list)
    """
    The items held.
    """
