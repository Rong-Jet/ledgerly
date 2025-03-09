from flask import Flask, request, jsonify
import pandas as pd

app = Flask(__name__)

@app.route("/process_transactions", methods=["POST"])
def process_transactions():
    data = request.get_json()
    transactions = data.get("transactions", [])

    if not transactions:
        return jsonify({"error": "No transactions received"}), 400

    # Convert transactions list to a pandas DataFrame for demonstration
    df = pd.DataFrame(transactions)

    # Example: Let's say we want to compute the sum of transaction amounts per category
    # In the Plaid sandbox, 'category' might be a nested list. We'll handle that carefully.

    # If the 'category' field is a list, let's convert it to a string so we can group by it easily
    df["category_str"] = df["category"].apply(lambda c: ", ".join(c) if isinstance(c, list) else str(c))

    # We'll group by category_str and sum the amounts
    grouped = df.groupby("category_str")["amount"].sum().reset_index()
    grouped.rename(columns={"amount": "total_amount"}, inplace=True)

    # Convert result back to a list of dicts
    result = grouped.to_dict(orient="records")

    return jsonify({
        "summary_by_category": result,
        "raw_count": len(transactions)
    })

if __name__ == "__main__":
    app.run(port=5000, debug=True)
