"""Reproducible user-based CF comparison for MovieLens ratings.csv."""

import argparse
import csv
import math
import random
from collections import defaultdict
from statistics import mean


def read_ratings(path):
    with open(path, newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        required = {"userId", "movieId", "rating", "timestamp"}
        if set(reader.fieldnames or []) != required:
            raise ValueError(f"ratings.csv columns must be {sorted(required)}")
        return [
            (int(row["userId"]), int(row["movieId"]),
             float(row["rating"]), int(row["timestamp"]))
            for row in reader
        ]


def split_rows(rows, seed=30112):
    """Split within each user; users with fewer than 3 ratings stay in train."""
    by_user = defaultdict(list)
    for row in rows:
        by_user[row[0]].append(row)

    train, validation, test = [], [], []
    for user in sorted(by_user):
        user_rows = sorted(by_user[user], key=lambda row: (row[3], row[1]))
        random.Random(seed + user).shuffle(user_rows)
        count = len(user_rows)
        if count < 3:
            train.extend(user_rows)
            continue
        validation_count = max(1, count // 10)
        test_count = max(1, count // 10)
        while count - validation_count - test_count < 1:
            if test_count > 1:
                test_count -= 1
            else:
                validation_count -= 1
        test.extend(user_rows[:test_count])
        validation.extend(user_rows[test_count:test_count + validation_count])
        train.extend(user_rows[test_count + validation_count:])
    return train, validation, test


def build_matrix(rows):
    matrix = defaultdict(dict)
    for user, item, rating, _ in rows:
        matrix[user][item] = rating
    return dict(matrix)


def similarity(matrix, user, other, metric, min_common):
    common = sorted(set(matrix.get(user, {})) & set(matrix.get(other, {})))
    if len(common) < min_common:
        return None
    x = [matrix[user][item] for item in common]
    y = [matrix[other][item] for item in common]
    if metric == "euclidean":
        distance = math.sqrt(sum((a - b) ** 2 for a, b in zip(x, y)))
        return 1 / (1 + distance)

    x_bar, y_bar = mean(x), mean(y)
    dx = [value - x_bar for value in x]
    dy = [value - y_bar for value in y]
    denominator = math.sqrt(sum(v * v for v in dx) * sum(v * v for v in dy))
    if denominator == 0:
        return None
    return sum(a * b for a, b in zip(dx, dy)) / denominator


def predict(matrix, user_means, global_mean, similarity_cache,
            user, item, metric, k, min_common, rating_min, rating_max):
    fallback = user_means.get(user, global_mean)

    neighbors = []
    for other, ratings in matrix.items():
        if other == user or item not in ratings:
            continue
        cache_key = (user, other)
        if cache_key not in similarity_cache:
            similarity_cache[cache_key] = similarity(
                matrix, user, other, metric, min_common
            )
        score = similarity_cache[cache_key]
        if score is None or score <= 0:
            continue
        neighbors.append((score, other))
    neighbors.sort(key=lambda pair: (-pair[0], pair[1]))
    neighbors = neighbors[:k]
    if not neighbors:
        return min(rating_max, max(rating_min, fallback)), True

    numerator = sum(
        score * (matrix[other][item] - user_means[other])
        for score, other in neighbors
    )
    denominator = sum(abs(score) for score, _ in neighbors)
    if denominator == 0:
        return min(rating_max, max(rating_min, fallback)), True
    raw = fallback + numerator / denominator
    return min(rating_max, max(rating_min, raw)), False


def evaluate(matrix, pairs, metric, k, min_common, rating_min, rating_max):
    absolute_errors, squared_errors = [], []
    fallback_count = 0
    user_means = {user: mean(ratings.values()) for user, ratings in matrix.items()}
    global_mean = mean(
        rating for ratings in matrix.values() for rating in ratings.values()
    )
    similarity_cache = {}
    for user, item, actual, _ in pairs:
        predicted, used_fallback = predict(
            matrix, user_means, global_mean, similarity_cache,
            user, item, metric, k, min_common, rating_min, rating_max
        )
        error = predicted - actual
        absolute_errors.append(abs(error))
        squared_errors.append(error * error)
        fallback_count += int(used_fallback)
    if not pairs:
        return {"mae": math.nan, "mse": math.nan, "coverage": 0.0,
                "fallback_rate": 0.0}
    return {
        "mae": mean(absolute_errors),
        "mse": mean(squared_errors),
        "coverage": 1 - fallback_count / len(pairs),
        "fallback_rate": fallback_count / len(pairs),
    }


def select_config(matrix, validation, metric, rating_min, rating_max):
    candidates = [(10, 2), (10, 3), (20, 2), (20, 3)]
    scored = []
    for k, min_common in candidates:
        result = evaluate(
            matrix, validation, metric, k, min_common, rating_min, rating_max
        )
        scored.append((result["mse"], k, min_common, result))
    scored.sort(key=lambda row: (row[0], row[1], row[2]))
    return scored[0]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("ratings_csv")
    parser.add_argument("--seed", type=int, default=30112)
    parser.add_argument("--rating-min", type=float, default=0.5)
    parser.add_argument("--rating-max", type=float, default=5.0)
    args = parser.parse_args()
    if args.rating_min >= args.rating_max:
        raise ValueError("rating-min must be smaller than rating-max")

    rows = read_ratings(args.ratings_csv)
    train, validation, test = split_rows(rows, args.seed)
    matrix = build_matrix(train)
    print(f"seed={args.seed} train={len(train)} validation={len(validation)} test={len(test)}")
    for metric in ("euclidean", "pearson"):
        _, k, min_common, validation_result = select_config(
            matrix, validation, metric, args.rating_min, args.rating_max
        )
        test_result = evaluate(
            matrix, test, metric, k, min_common, args.rating_min, args.rating_max
        )
        print(
            metric,
            f"selected(k={k}, min_common={min_common})",
            f"validation_MSE={validation_result['mse']:.6f}",
            f"test_MSE={test_result['mse']:.6f}",
            f"test_MAE={test_result['mae']:.6f}",
            f"coverage={test_result['coverage']:.2%}",
            f"fallback={test_result['fallback_rate']:.2%}",
        )


if __name__ == "__main__":
    main()
