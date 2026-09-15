const fs = require("fs");
const path = require("path");

const BRAND_LOGO_PATH = path.resolve(__dirname, "../../../assets/qs_icon.jpg");

const xmlEscape = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

const excelColumn = (index) => {
    let value = index + 1;
    let label = "";
    while (value > 0) {
        const remainder = (value - 1) % 26;
        label = String.fromCharCode(65 + remainder) + label;
        value = Math.floor((value - 1) / 26);
    }
    return label;
};

const excelCell = (value, type = "string") => {
    if (type === "number") {
        const numeric = Number(value);
        return `<c t="n"><v>${Number.isFinite(numeric) ? numeric : 0}</v></c>`;
    }

    return `<c t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
};

const buildSheetXml = (rows) => {
    const body = rows
        .map((row, rowIndex) => {
            const cells = row
                .map((value, colIndex) => {
                    const isNumber =
                        typeof value === "number" && Number.isFinite(value);
                    return `${excelCell(value, isNumber ? "number" : "string")}`;
                })
                .join("");

            return `<row r="${rowIndex + 1}">${cells}</row>`;
        })
        .join("");

    const dimensionEnd = `${excelColumn(Math.max((rows[0]?.length || 1) - 1, 0))}${rows.length || 1}`;

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="A1:${dimensionEnd}"/>
<sheetViews><sheetView workbookViewId="0"/></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<sheetData>${body}</sheetData>
</worksheet>`;
};

const crc32 = (buffer) => {
    let crc = 0xffffffff;
    for (let index = 0; index < buffer.length; index += 1) {
        crc ^= buffer[index];
        for (let bit = 0; bit < 8; bit += 1) {
            crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
        }
    }
    return (crc ^ 0xffffffff) >>> 0;
};

const uint32 = (value) => {
    const buffer = Buffer.alloc(4);
    buffer.writeUInt32LE(value >>> 0, 0);
    return buffer;
};

const uint16 = (value) => {
    const buffer = Buffer.alloc(2);
    buffer.writeUInt16LE(value, 0);
    return buffer;
};

const buildZip = (files) => {
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const file of files) {
        const name = Buffer.from(file.name, "utf8");
        const data = Buffer.isBuffer(file.data)
            ? file.data
            : Buffer.from(file.data, "utf8");
        const checksum = crc32(data);

        const localHeader = Buffer.concat([
            Buffer.from([0x50, 0x4b, 0x03, 0x04]),
            uint16(20),
            uint16(0),
            uint16(0),
            uint16(0),
            uint16(0),
            uint32(checksum),
            uint32(data.length),
            uint32(data.length),
            uint16(name.length),
            uint16(0),
            name,
            data,
        ]);

        localParts.push(localHeader);

        const centralHeader = Buffer.concat([
            Buffer.from([0x50, 0x4b, 0x01, 0x02]),
            Buffer.from([20, 0]),
            Buffer.from([20, 0]),
            uint16(0),
            uint16(0),
            uint16(0),
            uint16(0),
            uint32(checksum),
            uint32(data.length),
            uint32(data.length),
            uint16(name.length),
            uint16(0),
            uint16(0),
            uint16(0),
            uint16(0),
            uint32(0),
            uint32(offset),
            name,
        ]);

        centralParts.push(centralHeader);
        offset += localHeader.length;
    }

    const centralDirectory = Buffer.concat(centralParts);
    const localData = Buffer.concat(localParts);
    const endRecord = Buffer.concat([
        Buffer.from([0x50, 0x4b, 0x05, 0x06]),
        uint16(0),
        uint16(0),
        uint16(files.length),
        uint16(files.length),
        uint32(centralDirectory.length),
        uint32(localData.length),
        uint16(0),
    ]);

    return Buffer.concat([localData, centralDirectory, endRecord]);
};

const buildXlsx = ({ orders = [], items = [] }) => {
    const orderRows = [
        [
            "Order Number",
            "Customer",
            "Phone",
            "Mode",
            "Table",
            "Order Type",
            "Status",
            "Total",
            "Placed At",
            "Notes",
        ],
        ...orders.map((order) => [
            order.order_number,
            order.customer_name || "Walk-in Customer",
            order.customer_mobile || "-",
            order.order_mode === "DineIn" ? "Dine In" : order.order_mode || "-",
            order.table_number ? `Table ${order.table_number}` : "Takeaway",
            order.order_type || "New",
            order.status || "Pending",
            Number(order.total || 0),
            order.created_at ? new Date(order.created_at).toLocaleString("en-IN") : "-",
            order.notes || "",
        ]),
    ];

    const itemRows = [
        [
            "Order Number",
            "Customer",
            "Item",
            "Quantity",
            "Unit Price",
            "Subtotal",
        ],
        ...items.map((item) => [
            item.order_number,
            item.customer_name || "Walk-in Customer",
            item.name,
            Number(item.quantity || 0),
            Number(item.price || 0),
            Number(item.subtotal || 0),
        ]),
    ];

    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
<sheet name="Orders" sheetId="1" r:id="rId1"/>
<sheet name="Order Items" sheetId="2" r:id="rId2"/>
</sheets>
</workbook>`;

    const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
</Relationships>`;

    const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

    return buildZip([
        { name: "[Content_Types].xml", data: contentTypes },
        { name: "_rels/.rels", data: rootRels },
        { name: "xl/workbook.xml", data: workbookXml },
        { name: "xl/_rels/workbook.xml.rels", data: workbookRels },
        { name: "xl/worksheets/sheet1.xml", data: buildSheetXml(orderRows) },
        { name: "xl/worksheets/sheet2.xml", data: buildSheetXml(itemRows) },
    ]);
};

const pdfEscape = (value) =>
    String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)")
        .replace(/[^\x20-\x7e]/g, "?");

const truncate = (value, length) => {
    const text = String(value ?? "-");
    return text.length > length ? `${text.slice(0, Math.max(length - 3, 1))}...` : text;
};

const money = (value) => `INR ${Number(value || 0).toFixed(2)}`;

const loadLogo = () => {
    if (!fs.existsSync(BRAND_LOGO_PATH)) {
        return null;
    }

    return {
        width: 400,
        height: 258,
        stream: fs.readFileSync(BRAND_LOGO_PATH),
    };
};

const makePdf = async ({ orders = [] }) => {
    const logo = loadLogo();
    const pageWidth = 595;
    const pageHeight = 842;
    const objects = [];
    const addObject = (content) => {
        objects.push(Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8"));
        return objects.length;
    };

    const catalogId = addObject("");
    const pagesId = addObject("");
    const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    let imageId = null;

    if (logo) {
        imageId = addObject(
            `<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.stream.length} >>\nstream\n`,
        );
        const imageHeader = objects[imageId - 1];
        objects[imageId - 1] = Buffer.concat([
            imageHeader,
            logo.stream,
            Buffer.from("\nendstream"),
        ]);
    }

    const rowsPerPage = 26;
    const chunks = [];
    for (let index = 0; index < orders.length; index += rowsPerPage) {
        chunks.push(orders.slice(index, index + rowsPerPage));
    }
    if (!chunks.length) chunks.push([]);

    const pageIds = [];

    chunks.forEach((chunk, pageIndex) => {
        const commands = [];

        if (logo) {
            const logoWidth = 92;
            const logoHeight = (logo.height / logo.width) * logoWidth;
            commands.push(`q ${logoWidth} 0 0 ${logoHeight} 32 ${pageHeight - logoHeight - 25} cm /Im1 Do Q`);
        }

        commands.push(`BT /F1 18 Tf 135 ${pageHeight - 45} Td (${pdfEscape("QuickServe")}) Tj ET`);
        commands.push(`BT /F1 10 Tf 135 ${pageHeight - 62} Td (${pdfEscape("Order Export Report")}) Tj ET`);
        commands.push(`BT /F1 8 Tf 32 ${pageHeight - 92} Td (${pdfEscape(`Generated: ${new Date().toLocaleString("en-IN")}`)}) Tj ET`);
        commands.push(`BT /F1 8 Tf 32 ${pageHeight - 108} Td (${pdfEscape(`Orders in export: ${orders.length}`)}) Tj ET`);

        const headerY = pageHeight - 140;
        commands.push(`BT /F1 8 Tf 32 ${headerY} Td (${pdfEscape("Order")}) Tj ET`);
        commands.push(`BT /F1 8 Tf 120 ${headerY} Td (${pdfEscape("Customer")}) Tj ET`);
        commands.push(`BT /F1 8 Tf 245 ${headerY} Td (${pdfEscape("Mode / Table")}) Tj ET`);
        commands.push(`BT /F1 8 Tf 355 ${headerY} Td (${pdfEscape("Status")}) Tj ET`);
        commands.push(`BT /F1 8 Tf 440 ${headerY} Td (${pdfEscape("Total")}) Tj ET`);
        commands.push(`BT /F1 8 Tf 500 ${headerY} Td (${pdfEscape("Date")}) Tj ET`);
        commands.push(`0.85 0.85 0.85 RG 32 ${headerY - 7} m 563 ${headerY - 7} l S`);

        chunk.forEach((order, rowIndex) => {
            const y = headerY - 24 - rowIndex * 25;
            const customer = truncate(order.customer_name || "Walk-in Customer", 20);
            const modeTable = `${order.order_mode === "DineIn" ? "Dine In" : order.order_mode || "-"} / ${order.table_number ? `T${order.table_number}` : "Takeaway"}`;
            const date = order.created_at ? new Date(order.created_at).toLocaleDateString("en-IN") : "-";

            commands.push(`BT /F1 7 Tf 32 ${y} Td (${pdfEscape(`#${order.order_number || order.id}`)}) Tj ET`);
            commands.push(`BT /F1 7 Tf 120 ${y} Td (${pdfEscape(customer)}) Tj ET`);
            commands.push(`BT /F1 7 Tf 245 ${y} Td (${pdfEscape(truncate(modeTable, 18))}) Tj ET`);
            commands.push(`BT /F1 7 Tf 355 ${y} Td (${pdfEscape(order.status || "Pending")}) Tj ET`);
            commands.push(`BT /F1 7 Tf 440 ${y} Td (${pdfEscape(money(order.total))}) Tj ET`);
            commands.push(`BT /F1 7 Tf 500 ${y} Td (${pdfEscape(date)}) Tj ET`);
            commands.push(`0.92 0.92 0.92 RG 32 ${y - 7} m 563 ${y - 7} l S`);
        });

        commands.push(`BT /F1 7 Tf 32 24 Td (${pdfEscape(`Page ${pageIndex + 1} of ${chunks.length}`)}) Tj ET`);

        const stream = Buffer.from(commands.join("\n"), "ascii");
        const contentId = addObject(Buffer.concat([
            Buffer.from(`<< /Length ${stream.length} >>\nstream\n`),
            stream,
            Buffer.from("\nendstream"),
        ]));

        const resources = logo
            ? `<< /Font << /F1 ${fontId} 0 R >> /XObject << /Im1 ${imageId} 0 R >> >>`
            : `<< /Font << /F1 ${fontId} 0 R >> >>`;

        const pageId = addObject(
            `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources ${resources} /Contents ${contentId} 0 R >>`,
        );
        pageIds.push(pageId);
    });

    objects[catalogId - 1] = Buffer.from(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`, "utf8");
    objects[pagesId - 1] = Buffer.from(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`, "utf8");

    let pdf = Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary");
    const offsets = [0];

    objects.forEach((object, index) => {
        offsets[index + 1] = pdf.length;
        pdf = Buffer.concat([
            pdf,
            Buffer.from(`${index + 1} 0 obj\n`),
            object,
            Buffer.from("\nendobj\n"),
        ]);
    });

    const xrefOffset = pdf.length;
    const xref = [
        `xref`,
        `0 ${objects.length + 1}`,
        `0000000000 65535 f `,
        ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
        `trailer`,
        `<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>`,
        `startxref`,
        `${xrefOffset}`,
        `%%EOF`,
    ].join("\n");

    pdf = Buffer.concat([pdf, Buffer.from(xref, "ascii")]);
    return pdf;
};

module.exports = {
    buildXlsx,
    makePdf,
};
