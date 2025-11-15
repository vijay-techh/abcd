const pool = require("./db");
const dayjs = require("dayjs");
const { v4: uuidv4 } = require("uuid");

module.exports = async (req, res) => {
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  const client = await pool.connect();

  try {
    const {
      name, phone, alt_phone, address,
      rent_start, rent_end, items = [], order_date
    } = req.body;

    if (!name || !phone || !address)
      return res.json({ success: false, error: "Missing required fields" });

    if (!items.length)
      return res.json({ success: false, error: "No product items found" });

    await client.query("BEGIN");

    // Check existing customer
    const cx = await client.query(
      "SELECT id FROM customers WHERE phone=$1",
      [phone]
    );

    let customerId;

    if (cx.rows.length) {
      customerId = cx.rows[0].id;
      await client.query(
        `UPDATE customers SET name=$1, alt_phone=$2, address=$3 WHERE id=$4`,
        [name, alt_phone || null, address, customerId]
      );
    } else {
      const cust = await client.query(
        `INSERT INTO customers (name, phone, alt_phone, address)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [name, phone, alt_phone || null, address]
      );
      customerId = cust.rows[0].id;
    }

    const finalOrderDate = order_date || dayjs().format("YYYY-MM-DD");

    const ord = await client.query(
      `INSERT INTO orders (invoice_no, customer_id, order_date, rent_start, rent_end, total)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id`,
      [
        uuidv4(),
        customerId,
        finalOrderDate,
        rent_start || null,
        rent_end || null,
        0
      ]
    );

    const orderId = ord.rows[0].id;

    let total = 0;

    for (const it of items) {
      const price = Number(it.price);
      const qty = Number(it.quantity);
      const line = price * qty;
      total += line;

      await client.query(
        `INSERT INTO order_items (order_id, product, price, quantity, line_total)
         VALUES ($1,$2,$3,$4,$5)`,
        [orderId, it.product, price, qty, line]
      );
    }

    await client.query(
      "UPDATE orders SET total=$1 WHERE id=$2",
      [total, orderId]
    );

    await client.query("COMMIT");

    return res.json({ success: true, customerId, orderId });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("NEW CUSTOMER ERROR:", err);
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};
