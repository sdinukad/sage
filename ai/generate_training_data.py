"""
Synthetic Training Data Generator for Sage Intent Classifier

Generates ~1200 labeled examples for 5 intent classes:
  - add_expense
  - add_income
  - query
  - edit_expense
  - edit_income

Output: ai/data/train.jsonl, ai/data/eval.jsonl (80/20 split)
"""

import json
import random
import os

random.seed(42)

# --- Templates ---

EXPENSE_CATEGORIES = [
    "Food", "Transport", "Bills", "Entertainment", "Health",
    "Shopping", "Other", "Groceries", "Fuel", "Rent",
    "Electricity", "Water", "Internet", "Phone", "Gym",
    "Coffee", "Lunch", "Dinner", "Snacks", "Clothing"
]

INCOME_CATEGORIES = ["Salary", "Bonus", "Investment", "Gift", "Freelance", "Other"]

AMOUNTS = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 750, 800,
           1000, 1200, 1500, 2000, 2500, 3000, 3500, 4000, 5000, 6000, 7500,
           8000, 10000, 12000, 15000, 20000, 25000, 30000, 35000, 40000, 50000,
           60000, 75000, 80000, 100000, 120000, 150000]

DATE_REFS = [
    "today", "yesterday", "last week", "last month", "this morning",
    "on Monday", "on Friday", "two days ago", "3 days ago",
    "March 5", "Jan 15", "February 20", "last Tuesday",
    "this week", "on the 15th", "earlier today", ""
]

EXPENSE_NOTES = [
    "lunch", "dinner", "breakfast", "uber", "grab", "taxi", "bus",
    "train", "movie", "netflix", "spotify", "gym membership",
    "groceries", "supermarket", "pharmacy", "medicine", "doctor",
    "dentist", "coffee", "snacks", "clothes", "shoes", "phone bill",
    "electricity bill", "water bill", "internet bill", "rent",
    "gas", "fuel", "petrol", "parking", "toll", "insurance",
    "haircut", "laundry", "books", "stationery", "gifts",
    "donation", "restaurant", "takeaway", "delivery", "pizza",
    "burger", "rice and curry", "kottu", "string hoppers"
]

# --- ADD_EXPENSE templates ---

ADD_EXPENSE_TEMPLATES = [
    "spent {amount} on {category}",
    "spent {amount} for {note}",
    "paid {amount} for {note}",
    "{note} {amount}",
    "{note} cost {amount}",
    "{note} was {amount}",
    "bought {note} for {amount}",
    "had {note} for {amount}",
    "just spent {amount} on {note}",
    "dropped {amount} on {note}",
    "spent {amount} on {note} {date}",
    "paid {amount} for {note} {date}",
    "{amount} {note}",
    "{amount} for {note}",
    "{amount} on {note}",
    "{amount} {category} {date}",
    "add expense {amount} {category}",
    "add {amount} for {note}",
    "log {amount} {note}",
    "record {amount} for {category}",
    "new expense {amount} {note}",
    "{note} {date} {amount}",
    "i spent {amount} on {note}",
    "i paid {amount} for {note}",
    "just paid {amount} for {note}",
    "i bought {note} {amount}",
    "spent rs {amount} on {note}",
    "spent rs. {amount} for {note}",
    "lkr {amount} for {note}",
    "{amount} rupees for {note}",
    "{amount} rupees {note}",
    "charged {amount} for {note}",
    "spent about {amount} on {note}",
    "{note} came to {amount}",
    "{note} bill {amount}",
    "{note} tab was {amount}",
    "blew {amount} on {note}",
    "used {amount} for {note}",
    "expense {amount} {note}",
    "{note} expense {amount}",
    "put {amount} down for {note}",
    "putting down {amount} for {note}",
    "{note} took {amount} from me",
    "lost {amount} to {note}",
    "cost me {amount} for {note}",
    "my {note} was {amount}",
]

# --- ADD_INCOME templates ---

ADD_INCOME_TEMPLATES = [
    "got paid {amount}",
    "received {amount} {category}",
    "earned {amount}",
    "salary {amount}",
    "got my salary {amount}",
    "income {amount} {category}",
    "received {category} {amount}",
    "got {amount} from {category}",
    "earned {amount} from {category}",
    "add income {amount} {category}",
    "log income {amount}",
    "received payment {amount}",
    "got {amount} {category}",
    "my {category} is {amount}",
    "got my {category} of {amount}",
    "{category} came in {amount}",
    "{category} {amount}",
    "deposited {amount}",
    "got a {category} of {amount}",
    "received my {category} {amount}",
    "{amount} {category} received",
    "i got {amount} as {category}",
    "i received {amount} {category}",
    "{category} payment {amount}",
    "added {amount} income",
    "{amount} income from {category}",
    "got paid {amount} {date}",
    "received {amount} {category} {date}",
    "salary came {amount}",
    "paycheck {amount}",
    "made {amount} doing {note}",
    "sold {note} for {amount}",
    "{category} gig got me {amount}",
    "{amount} from {category} gig",
    "cleared {amount} from {category}",
    "cashed in {amount} for {category}",
    "won {amount} from {category}",
]

# --- QUERY templates ---

QUERY_TEMPLATES = [
    "how much did I spend this month?",
    "how much did I spend this week?",
    "how much did I spend today?",
    "how much did I spend on {category}?",
    "what's my total spending?",
    "what's my biggest expense?",
    "what's my biggest category?",
    "show me my expenses",
    "show {category} expenses",
    "show food expenses",
    "show my spending",
    "list all expenses",
    "what did I spend on {category}?",
    "how much on {category}?",
    "total expenses this month",
    "total spending on {category}",
    "breakdown of my expenses",
    "spending summary",
    "expense summary",
    "how much have I spent?",
    "where does my money go?",
    "what are my top expenses?",
    "show recent expenses",
    "last 10 expenses",
    "how much did I spend yesterday?",
    "how much did I spend last week?",
    "how much did I spend in March?",
    "average daily spending",
    "how much income this month?",
    "total income",
    "show my incomes",
    "how much did I earn this month?",
    "what's my net balance?",
    "am I saving money?",
    "how much left from salary?",
    "compare income vs expenses",
    "spending trend",
    "monthly summary",
    "weekly summary",
    "daily average",
    "what's my balance?",
    "how much do I have left?",
    "show me everything",
    "how much on transport?",
    "food expenses this week",
    "entertainment spending",
    "how much was {note}?",
    "find {note}",
    "search {note}",
    "when did I buy {note}?",
]

# --- EDIT_EXPENSE templates ---

EDIT_EXPENSE_TEMPLATES = [
    "change {note} to {amount}",
    "update {note} amount to {amount}",
    "edit {note} to {amount}",
    "fix {note} it was {amount}",
    "change yesterday's {note} to {amount}",
    "modify {note} amount to {amount}",
    "correct {note} to {amount}",
    "{note} was actually {amount}",
    "{note} should be {amount}",
    "update the {category} expense to {amount}",
    "change {category} from {date} to {amount}",
    "the {note} was {amount} not {amount2}",
    "change the amount of {note} to {amount}",
    "edit last {category} expense",
    "update my last expense",
    "fix the {note} expense",
    "change {note} category to {category}",
    "move {note} to {category}",
    "recategorize {note} as {category}",
    "change date of {note} to {date}",
    "that {note} was on {date} not today",
    "edit expense {note}",
    "modify the {note} entry",
    "correct last {category}",
    "update {note} description to {note2}",
]

# --- EDIT_INCOME templates ---

EDIT_INCOME_TEMPLATES = [
    "change salary to {amount}",
    "update my salary to {amount}",
    "edit income to {amount}",
    "fix salary it was {amount}",
    "my salary is actually {amount}",
    "salary should be {amount}",
    "update {category} to {amount}",
    "change {category} amount to {amount}",
    "edit {category} income to {amount}",
    "correct my {category} to {amount}",
    "the {category} was {amount}",
    "modify income {category} to {amount}",
    "change income from {amount} to {amount2}",
    "update last income",
    "edit my last income entry",
    "fix the {category} income",
    "change income category to {category}",
    "move {category} income to {category2}",
    "recategorize income as {category}",
    "income was {amount} not {amount2}",
]


def gen_add_expense(n: int):
    examples = []
    for _ in range(n):
        template = random.choice(ADD_EXPENSE_TEMPLATES)
        text = template.format(
            amount=random.choice(AMOUNTS),
            category=random.choice(EXPENSE_CATEGORIES),
            note=random.choice(EXPENSE_NOTES),
            date=random.choice(DATE_REFS),
        ).strip()
        examples.append({"text": text, "label": "add_expense"})
    return examples


def gen_add_income(n: int):
    examples = []
    for _ in range(n):
        template = random.choice(ADD_INCOME_TEMPLATES)
        text = template.format(
            amount=random.choice(AMOUNTS),
            category=random.choice(INCOME_CATEGORIES),
            date=random.choice(DATE_REFS),
            note=random.choice(["side gig", "old phone", "freelance work", "art piece", "coding", "design"]),
        ).strip()
        examples.append({"text": text, "label": "add_income"})
    return examples


def gen_query(n: int):
    examples = []
    for _ in range(n):
        template = random.choice(QUERY_TEMPLATES)
        text = template.format(
            category=random.choice(EXPENSE_CATEGORIES),
            note=random.choice(EXPENSE_NOTES),
        ).strip()
        # Remove trailing ? if doubled
        if text.endswith("??"):
            text = text[:-1]
        examples.append({"text": text, "label": "query"})
    return examples


def gen_edit_expense(n: int):
    examples = []
    for _ in range(n):
        template = random.choice(EDIT_EXPENSE_TEMPLATES)
        text = template.format(
            amount=random.choice(AMOUNTS),
            amount2=random.choice(AMOUNTS),
            category=random.choice(EXPENSE_CATEGORIES),
            note=random.choice(EXPENSE_NOTES),
            note2=random.choice(EXPENSE_NOTES),
            date=random.choice(DATE_REFS),
        ).strip()
        examples.append({"text": text, "label": "edit_expense"})
    return examples


def gen_edit_income(n: int):
    examples = []
    for _ in range(n):
        template = random.choice(EDIT_INCOME_TEMPLATES)
        text = template.format(
            amount=random.choice(AMOUNTS),
            amount2=random.choice(AMOUNTS),
            category=random.choice(INCOME_CATEGORIES),
            category2=random.choice(INCOME_CATEGORIES),
        ).strip()
        examples.append({"text": text, "label": "edit_income"})
    return examples


def main():
    print("Generating synthetic training data...")

    data = []
    data += gen_add_expense(350)
    data += gen_add_income(250)
    data += gen_query(300)
    data += gen_edit_expense(200)
    data += gen_edit_income(100)

    random.shuffle(data)

    # 80/20 split
    split = int(len(data) * 0.8)
    train = data[:split]
    eval_data = data[split:]

    os.makedirs("data", exist_ok=True)

    with open("data/train.jsonl", "w") as f:
        for item in train:
            f.write(json.dumps(item) + "\n")

    with open("data/eval.jsonl", "w") as f:
        for item in eval_data:
            f.write(json.dumps(item) + "\n")

    # Print stats
    from collections import Counter
    train_counts = Counter(d["label"] for d in train)
    eval_counts = Counter(d["label"] for d in eval_data)

    print(f"\nTotal: {len(data)} examples")
    print(f"Train: {len(train)} | Eval: {len(eval_data)}")
    print(f"\nTrain distribution:")
    for label, count in sorted(train_counts.items()):
        print(f"  {label}: {count}")
    print(f"\nEval distribution:")
    for label, count in sorted(eval_counts.items()):
        print(f"  {label}: {count}")


if __name__ == "__main__":
    main()
