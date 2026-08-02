"""Basit birim testleri — problems ve scoring."""

from __future__ import annotations

import tempfile
import unittest
from fractions import Fraction
from pathlib import Path

from problems import (
    answers_match,
    format_answer,
    make_evaluate,
    make_linear_equation,
    make_simplify,
    make_two_step,
    parse_answer,
)
from scoring import init_db, lifetime_stats, save_session


class ParseAnswerTests(unittest.TestCase):
    def test_integers(self):
        self.assertEqual(parse_answer("4"), Fraction(4))
        self.assertEqual(parse_answer("-3"), Fraction(-3))

    def test_fractions(self):
        self.assertEqual(parse_answer("1/2"), Fraction(1, 2))
        self.assertEqual(parse_answer("-3/4"), Fraction(-3, 4))

    def test_invalid(self):
        self.assertIsNone(parse_answer(""))
        self.assertIsNone(parse_answer("abc"))
        self.assertIsNone(parse_answer("1/0"))


class ProblemConsistencyTests(unittest.TestCase):
    def test_linear_answer_is_integerish(self):
        for _ in range(30):
            problem = make_linear_equation()
            self.assertEqual(problem.answer.denominator, 1)

    def test_simplify_coeff(self):
        for _ in range(20):
            problem = make_simplify()
            self.assertIsInstance(problem.answer, Fraction)

    def test_evaluate_and_two_step(self):
        for factory in (make_evaluate, make_two_step):
            problem = factory()
            self.assertTrue(problem.prompt)
            self.assertTrue(problem.hint)

    def test_answers_match(self):
        self.assertTrue(answers_match(Fraction(2, 4), Fraction(1, 2)))
        self.assertFalse(answers_match(Fraction(1), Fraction(2)))

    def test_format_answer(self):
        self.assertEqual(format_answer(Fraction(5)), "5")
        self.assertEqual(format_answer(Fraction(3, 2)), "3/2")


class ScoringTests(unittest.TestCase):
    def test_save_and_stats(self):
        with tempfile.TemporaryDirectory() as tmp:
            db = Path(tmp) / "test.db"
            init_db(db)
            save_session("karışık", 10, 7, db)
            save_session("değer bulma", 5, 5, db)
            asked, correct = lifetime_stats(db)
            self.assertEqual(asked, 15)
            self.assertEqual(correct, 12)


if __name__ == "__main__":
    unittest.main()
