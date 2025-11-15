const pool = require("../db");
const PDFDocument = require("pdfkit");
const dayjs = require("dayjs");

module.exports = async (req, res) => {
  try {
    const { orderId } = req.query;

    const orderQ = await pool.query(
      `SELECT o.*, c.name AS cname, c.phone AS cphone, c.address AS caddress
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       WHERE o.id=$1 LIMIT 1`,
      [orderId]
    );

    if (!orderQ.rows.length)
      return res.status(404).send("Order not found");

    const order = orderQ.rows[0];

    const itemsQ = await pool.query(
      "SELECT * FROM order_items WHERE order_id=$1",
      [orderId]
    );

    const doc = new PDFDocument({ size: "A4", margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=bill.pdf");

    doc.pipe(res);

    const teal = "#006666";

    doc.fontSize(12).fillColor(teal).text("9916067960, 8073024022", 40, 30);
    doc.fontSize(26).fillColor(teal).text("SUBRAMANI ENTERPRISES", 0, 60, {
      align: "center",
    });

    let cy = 130;
    doc.font("Helvetica").fontSize(12).fillColor("#000");
    doc.text(`DATE: ${dayjs(order.order_date).format("DD/MM/YYYY")}`, 0, cy, {
      align: "center",
    });
    cy += 25;
    doc.text(`CUSTOMER NAME: ${order.cname}`, 0, cy, { align: "center" });
    cy += 25;
    doc.text(`PHONE: ${order.cphone}`, 0, cy, { align: "center" });
    cy += 25;
    doc.text(`ADDRESS: ${order.caddress}`, 0, cy, { align: "center" });

    let top = doc.y + 30;
    doc.font("Helvetica-Bold").fontSize(11).fillColor(teal);
    doc.text("DESCRIPTION", 40, top);
    doc.text("PRICE", 260, top);
    doc.text("QTY", 350, top);
    doc.text("AMOUNT", 450, top);

    doc
      .moveTo(40, top + 15)
      .lineTo(550, top + 15)
      .strokeColor(teal)
      .stroke();

    doc.font("Helvetica").fontSize(10).fillColor("#000");
    let y = top + 25;
    let grand = 0;

    itemsQ.rows.forEach((it) => {
      const price = Number(it.price) || 0;
      const qty = Number(it.quantity) || 0;
      const amount = Number(it.line_total) || price * qty;

      doc.text(it.product, 40, y);
      doc.text(price.toFixed(2), 260, y);
      doc.text(qty.toString(), 350, y);
      doc.text(amount.toFixed(2), 450, y);

      grand += amount;
      y += 22;

      doc.moveTo(40, y).lineTo(550, y).strokeColor("#ddd").stroke();
    });

    y += 30;

    doc.strokeColor(teal).rect(350, y, 200, 50).stroke();

    doc.font("Helvetica-Bold").fontSize(13).fillColor(teal).text("TOTAL", 360, y + 8);
    doc
      .fontSize(16)
      .fillColor(teal)
      .text(`₹ ${grand.toFixed(2)}`, 360, y + 28);

    doc.moveDown(4);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(teal)
      .text(
        "5TH CROSS, CANNEL RIGHT SIDE, VENKATESHA NAGAR, SHIMOGA | 577202 | PHONE: 6363499137",
        { align: "center" }
      );

    doc.moveDown(1);
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(teal)
      .text("THANK YOU FOR YOUR BUSINESS!", { align: "center" });

    doc.end();
  } catch (err) {
    console.error("PDF ERROR:", err);
    if (!res.headersSent) res.status(500).send("PDF Error");
  }
};
