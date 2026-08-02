"""Cebir sorusu üreticileri: doğrusal denklem, sadeleştirme, değer bulma."""

from __future__ import annotations

import random
from dataclasses import dataclass
from fractions import Fraction


@dataclass(frozen=True)
class Problem:
    prompt: str
    answer: Fraction
    hint: str
    topic: str


def _frac(value: int | Fraction) -> Fraction:
    return value if isinstance(value, Fraction) else Fraction(value)


def _fmt(value: Fraction) -> str:
    value = Fraction(value).limit_denominator()
    if value.denominator == 1:
        return str(value.numerator)
    return f"{value.numerator}/{value.denominator}"


def _pick_nonzero(low: int, high: int) -> int:
    choices = [n for n in range(low, high + 1) if n != 0]
    return random.choice(choices)


def make_linear_equation() -> Problem:
    """ax + b = c  →  x = (c - b) / a"""
    a = _pick_nonzero(-8, 8)
    x = random.randint(-10, 10)
    b = random.randint(-12, 12)
    c = a * x + b

    left = f"{a}x"
    if b > 0:
        left += f" + {b}"
    elif b < 0:
        left += f" - {abs(b)}"

    prompt = f"Denklemi çöz (x kaç?):  {left} = {c}"
    answer = _frac(x)
    hint = f"Önce sabiti karşıya at, sonra {a}'ya böl."
    return Problem(prompt=prompt, answer=answer, hint=hint, topic="doğrusal denklem")


def make_simplify() -> Problem:
    """ax + bx + c  →  (a+b)x + c  (cevap: x'in katsayısı)"""
    a = _pick_nonzero(-9, 9)
    b = _pick_nonzero(-9, 9)
    c = random.randint(-15, 15)

    parts = [f"{a}x"]
    parts.append(f"+ {b}x" if b > 0 else f"- {abs(b)}x")
    if c > 0:
        parts.append(f"+ {c}")
    elif c < 0:
        parts.append(f"- {abs(c)}")

    expression = " ".join(parts)
    coeff = a + b
    prompt = (
        f"İfadeyi sadeleştir. x'in katsayısı kaçtır?\n"
        f"  {expression}"
    )
    hint = f"{a}x ile {b}x terimlerini topla."
    return Problem(
        prompt=prompt,
        answer=_frac(coeff),
        hint=hint,
        topic="sadeleştirme",
    )


def make_evaluate() -> Problem:
    """ax + b ifadesinde x = k için değer."""
    a = _pick_nonzero(-7, 7)
    b = random.randint(-12, 12)
    x = random.randint(-8, 8)
    value = a * x + b

    expr = f"{a}x"
    if b > 0:
        expr += f" + {b}"
    elif b < 0:
        expr += f" - {abs(b)}"

    prompt = f"x = {x} iken değeri bul:  {expr}"
    hint = f"x yerine {x} yaz: {a}*({x}) {'+' if b >= 0 else '-'} {abs(b)}"
    return Problem(
        prompt=prompt,
        answer=_frac(value),
        hint=hint,
        topic="değer bulma",
    )


def make_two_step() -> Problem:
    """(x + p) / q = r  →  x = r*q - p"""
    q = _pick_nonzero(2, 6)
    r = random.randint(-8, 8)
    p = random.randint(-10, 10)
    x = r * q - p

    inner = f"x + {p}" if p >= 0 else f"x - {abs(p)}"
    prompt = f"Denklemi çöz (x kaç?):  ({inner}) / {q} = {r}"
    hint = f"Önce her iki tarafı {q} ile çarp, sonra sabiti karşıya at."
    return Problem(
        prompt=prompt,
        answer=_frac(x),
        hint=hint,
        topic="iki adımlı denklem",
    )


GENERATORS = (
    make_linear_equation,
    make_simplify,
    make_evaluate,
    make_two_step,
)


TOPIC_LABELS = {
    "1": ("doğrusal denklem", make_linear_equation),
    "2": ("sadeleştirme", make_simplify),
    "3": ("değer bulma", make_evaluate),
    "4": ("iki adımlı denklem", make_two_step),
    "5": ("karışık", None),
}


def next_problem(topic_key: str = "5") -> Problem:
    if topic_key == "5" or topic_key not in TOPIC_LABELS:
        return random.choice(GENERATORS)()
    _label, factory = TOPIC_LABELS[topic_key]
    assert factory is not None
    return factory()


def parse_answer(raw: str) -> Fraction | None:
    text = raw.strip().replace(" ", "").replace(",", ".")
    if not text:
        return None
    try:
        if "/" in text:
            num_s, den_s = text.split("/", 1)
            return Fraction(int(num_s), int(den_s))
        if "." in text:
            return Fraction(text).limit_denominator(1000)
        return Fraction(int(text))
    except (ValueError, ZeroDivisionError):
        return None


def answers_match(user: Fraction, expected: Fraction) -> bool:
    return Fraction(user) == Fraction(expected)


def format_answer(value: Fraction) -> str:
    return _fmt(value)
