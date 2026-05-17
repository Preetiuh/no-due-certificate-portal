const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "public");
const DB_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DB_DIR, "database.json");
const DOWNLOAD_DIR = path.join(__dirname, "downloads");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

function normalize(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function ensureDatabase() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(createSeedDatabase(), null, 2));
  }
}

function readDatabase() {
  ensureDatabase();
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function writeDatabase(database) {
  fs.writeFileSync(DB_FILE, JSON.stringify(database, null, 2));
}

function createSeedDatabase() {
  const subjects = {
    "3": [
      ["23MAT31", "Mathematics 3"],
      ["23AD32", "DDCO"],
      ["23AD33", "OS"],
      ["23AD34", "DSA"],
      ["23ADL35", "DSA Lab"],
      ["23SCR36", "SCR"],
      ["23NSS37", "NSS"],
      ["23EXL38", "EXCEL"],
      ["23AD39", "OOPS with Java"]
    ],
    "4": [
      ["23AD41", "ADA"],
      ["23AD42", "AI"],
      ["23AD43", "DBMS"],
      ["23ADL44", "ADA Lab"],
      ["23BIO45", "Biology"],
      ["23UHV46", "UHV"],
      ["23NSS47", "NSS"],
      ["23MAT48", "DMS"],
      ["23WEB49", "MERN"]
    ],
    "5": [
      ["23AD51", "SEPM"],
      ["23AD52", "CN"],
      ["23AD53", "TOC"],
      ["23ADL54", "DV Lab"],
      ["23ADP55", "Mini Project"],
      ["23RMI56", "RM & IPR"],
      ["23EVS57", "EVS"],
      ["23NSS58", "NSS"],
      ["23CC59", "CC"]
    ],
    "6": [
      ["23AD61", "BDA"],
      ["23AD62", "ML"],
      ["23AD63", "HC-AI"],
      ["23AD64", "CE"],
      ["23ADP65", "Project P-1"],
      ["23ADL66", "DevOps Lab"],
      ["23IKS67", "IKS"],
      ["23NSS68", "NSS"]
    ],
    "7": [
      ["23AD71", "IOT"],
      ["23AD72", "PM"],
      ["23AD73", "CNS"],
      ["23ADP74", "Major Project P-2"],
      ["23AD75", "CNR"],
      ["23AD76", "BDA"]
    ],
    "8": [
      ["23AD81", "sub1"],
      ["23AD82", "sub2"],
      ["23AD83", "sub3"]
    ]
  };

  const semesters = Object.entries(subjects).map(([semester, list]) => ({
    id: semester,
    label: `${semester}${ordinalSuffix(Number(semester))} Semester`,
    subjects: list.map(([code, name], index) => ({
      code,
      name,
      faculty: `faculty ${index + 1}`
    }))
  }));

  const studentGroups = {
    "3": [
      ["S3-001", "Aishwarya K", "4GW24AD001"],
      ["S3-002", "Ananya Rao", "4GW24AD002"],
      ["S3-003", "Bhoomika S", "4GW24AD003"],
      ["S3-004", "Chaitra M", "4GW24AD004"],
      ["S3-005", "Deepika N", "4GW24AD005"]
    ],
    "4": [
      ["S4-001", "Eesha Gowda", "4GW23AD006"],
      ["S4-002", "Fathima S", "4GW23AD007"],
      ["S4-003", "Gayathri R", "4GW23AD008"],
      ["S4-004", "Harshitha K", "4GW23AD009"],
      ["S4-005", "Ishitha P", "4GW23AD010"]
    ],
    "5": [
      ["S5-001", "Janhavi S", "4GW22AD011"],
      ["S5-002", "Kavya N", "4GW22AD012"],
      ["S5-003", "Lavanya M", "4GW22AD013"],
      ["S5-004", "Meghana R", "4GW22AD014"],
      ["S5-005", "Nandini H", "4GW22AD015"]
    ],
    "6": [
      ["S6-001", "Oviya S", "4GW22AD016"],
      ["S6-002", "Pooja K", "4GW22AD017"],
      ["S6-003", "Rachana M", "4GW22AD018"],
      ["S6-004", "Sanjana R", "4GW22AD019"],
      ["S6-005", "Tanvi N", "4GW22AD020"]
    ],
    "7": [
      ["S7-001", "Vaishnavi S", "4GW21AD021"],
      ["S7-002", "Yashaswini K", "4GW21AD022"],
      ["S7-003", "Zoya F", "4GW21AD023"],
      ["S7-004", "Amulya R", "4GW21AD024"],
      ["S7-005", "Bhavya N", "4GW21AD025"]
    ],
    "8": [
      ["S8-001", "Charitha S", "4GW20AD026"],
      ["S8-002", "Dhanusha K", "4GW20AD027"],
      ["S8-003", "Inchara M", "4GW20AD028"],
      ["S8-004", "Keerthana R", "4GW20AD029"],
      ["S8-005", "Likitha N", "4GW20AD030"]
    ]
  };

  const students = Object.entries(studentGroups).flatMap(([semester, records]) => {
    const subjectCount = subjects[semester].length;
    return records.map(([id, name, usn]) => ({
      id,
      name,
      usn,
      semester,
      username: name,
      password: name,
      dues: Array(subjectCount).fill(false)
    }));
  });

  return {
    institute: "GSSS Institute Of Engineering And Technology For Women",
    department: "Department Of Artificial Intelligence And Data Science",
    faculties: Array.from({ length: 9 }, (_, index) => {
      const name = `faculty ${index + 1}`;
      return {
        id: `F-${index + 1}`,
        name,
        username: name,
        password: name,
        subjectIndex: index
      };
    }),
    semesters,
    students
  };
}

function ordinalSuffix(number) {
  if (number === 3) return "rd";
  return "th";
}

function publicSemesters(database) {
  return database.semesters.map((semester) => ({
    id: semester.id,
    label: semester.label,
    subjectCount: semester.subjects.length
  }));
}

function getSemester(database, semesterId) {
  return database.semesters.find((semester) => semester.id === String(semesterId));
}

function publicStudent(student) {
  return {
    id: student.id,
    name: student.name,
    usn: student.usn,
    semester: student.semester,
    dues: student.dues
  };
}

function buildCertificate(database, student) {
  const semester = getSemester(database, student.semester);
  return {
    institute: database.institute,
    department: database.department,
    title: "NO DUE CERTIFICATE",
    student: {
      id: student.id,
      name: student.name,
      usn: student.usn,
      semester: semester.label
    },
    subjects: semester.subjects.map((subject, index) => ({
      ...subject,
      status: Boolean(student.dues[index])
    }))
  };
}

function titleCase(value) {
  return String(value)
    .split(" ")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function pdfEscape(value) {
  return String(value).replace(/[\\()]/g, "\\$&");
}

function createCertificatePdf(certificate) {
  const pageWidth = 595;
  const pageHeight = 842;
  const left = 54;
  const right = pageWidth - 54;
  let content = "";

  const add = (command) => {
    content += command;
  };
  const text = (x, y, size, value, font = "F1") => {
    add(`BT /${font} ${size} Tf ${x} ${y} Td (${pdfEscape(value)}) Tj ET\n`);
  };
  const line = (x1, y1, x2, y2) => {
    add(`${x1} ${y1} m ${x2} ${y2} l S\n`);
  };
  const rect = (x, y, width, height) => {
    add(`${x} ${y} ${width} ${height} re S\n`);
  };
  const check = (x, y, checked) => {
    rect(x, y, 13, 13);
    if (checked) {
      add("0.10 0.55 0.32 RG 2 w\n");
      add(`${x + 3} ${y + 7} m ${x + 6} ${y + 3} l ${x + 11} ${y + 11} l S\n`);
      add("0 0 0 RG 1 w\n");
    }
  };

  add("0 0 0 RG 1 w\n");
  rect(36, 38, 523, 766);
  text(82, 770, 15, certificate.institute, "F2");
  text(96, 748, 11, certificate.department, "F2");
  line(left, 728, right, 728);
  text(204, 702, 16, certificate.title, "F2");

  text(left, 664, 11, `Student Name: ${certificate.student.name}`, "F2");
  text(left, 642, 11, `USN: ${certificate.student.usn}`, "F2");
  text(330, 642, 11, `Semester: ${certificate.student.semester}`, "F2");

  const tableTop = 604;
  const rowHeight = 28;
  const colX = [left, 150, 315, 445, right];
  rect(left, tableTop - rowHeight, right - left, rowHeight);
  line(colX[1], tableTop, colX[1], tableTop - rowHeight);
  line(colX[2], tableTop, colX[2], tableTop - rowHeight);
  line(colX[3], tableTop, colX[3], tableTop - rowHeight);
  text(colX[0] + 8, tableTop - 18, 10, "Subject Code", "F2");
  text(colX[1] + 8, tableTop - 18, 10, "Subject Name", "F2");
  text(colX[2] + 8, tableTop - 18, 10, "Faculty Name", "F2");
  text(colX[3] + 18, tableTop - 18, 10, "Status", "F2");

  certificate.subjects.forEach((subject, index) => {
    const top = tableTop - rowHeight * (index + 1);
    const bottom = top - rowHeight;
    rect(left, bottom, right - left, rowHeight);
    line(colX[1], top, colX[1], bottom);
    line(colX[2], top, colX[2], bottom);
    line(colX[3], top, colX[3], bottom);
    text(colX[0] + 8, bottom + 10, 9.5, subject.code);
    text(colX[1] + 8, bottom + 10, 9.5, subject.name);
    text(colX[2] + 8, bottom + 10, 9.5, titleCase(subject.faculty));
    check(colX[3] + 32, bottom + 8, subject.status);
  });

  line(left, 146, 242, 146);
  line(352, 146, right, 146);
  text(93, 127, 10, "Mentor Signature", "F2");
  text(407, 127, 10, "HOD Signature", "F2");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${content.length} >>\nstream\n${content}endstream`
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

function sendPdf(response, certificate) {
  const pdf = createCertificatePdf(certificate);
  const safeUsn = certificate.student.usn.replace(/[^a-z0-9_-]/gi, "_");

  response.writeHead(200, {
    "Content-Type": "application/pdf",
    "Content-Length": pdf.length,
    "Content-Disposition": `attachment; filename="No_Due_Certificate_${safeUsn}.pdf"`,
    "Cache-Control": "no-store"
  });
  response.end(pdf);
}

function savePdf(certificate) {
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }

  const safeUsn = certificate.student.usn.replace(/[^a-z0-9_-]/gi, "_");
  const filename = `No_Due_Certificate_${safeUsn}.pdf`;
  const filePath = path.join(DOWNLOAD_DIR, filename);
  fs.writeFileSync(filePath, createCertificatePdf(certificate));

  return {
    filename,
    filePath,
    url: `/api/downloads/${encodeURIComponent(filename)}`
  };
}

function sendSavedPdf(response, filename) {
  const safeFilename = path.basename(filename);
  const filePath = path.join(DOWNLOAD_DIR, safeFilename);

  if (!filePath.startsWith(DOWNLOAD_DIR) || !fs.existsSync(filePath)) {
    sendError(response, 404, "PDF file not found.");
    return;
  }

  const pdf = fs.readFileSync(filePath);
  response.writeHead(200, {
    "Content-Type": "application/pdf",
    "Content-Length": pdf.length,
    "Content-Disposition": `inline; filename="${safeFilename}"`,
    "Cache-Control": "no-store"
  });
  response.end(pdf);
}

function parseRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });

    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Invalid JSON body."));
      }
    });

    request.on("error", reject);
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function sendError(response, status, message) {
  sendJson(response, status, { error: message });
}

async function handleApi(request, response, url) {
  const database = readDatabase();

  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/semesters") {
    sendJson(response, 200, { semesters: publicSemesters(database) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/login") {
    const body = await parseRequestBody(request);
    const role = normalize(body.role);
    const username = normalize(body.username);
    const password = normalize(body.password);

    if (role === "faculty") {
      const faculty = database.faculties.find(
        (item) => normalize(item.username) === username && normalize(item.password) === password
      );

      if (!faculty) {
        sendError(response, 401, "Invalid faculty username or password.");
        return;
      }

      sendJson(response, 200, {
        role: "faculty",
        user: {
          id: faculty.id,
          name: faculty.name,
          subjectIndex: faculty.subjectIndex
        },
        semesters: publicSemesters(database)
      });
      return;
    }

    if (role === "student") {
      const student = database.students.find(
        (item) => normalize(item.username) === username && normalize(item.password) === password
      );

      if (!student) {
        sendError(response, 401, "Invalid student username or password.");
        return;
      }

      sendJson(response, 200, {
        role: "student",
        user: publicStudent(student),
        certificate: buildCertificate(database, student)
      });
      return;
    }

    sendError(response, 400, "Role must be faculty or student.");
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/students") {
    const semesterId = url.searchParams.get("semester");
    const semester = getSemester(database, semesterId);

    if (!semester) {
      sendError(response, 404, "Semester not found.");
      return;
    }

    const students = database.students
      .filter((student) => student.semester === semester.id)
      .map(publicStudent);

    sendJson(response, 200, {
      semester: {
        id: semester.id,
        label: semester.label,
        subjects: semester.subjects
      },
      students
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/certificate") {
    const studentId = url.searchParams.get("studentId");
    const usn = normalize(url.searchParams.get("usn"));
    const student = database.students.find(
      (item) => item.id === studentId || normalize(item.usn) === usn
    );

    if (!student) {
      sendError(response, 404, "Student not found.");
      return;
    }

    sendJson(response, 200, { certificate: buildCertificate(database, student) });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/certificate/pdf") {
    const studentId = url.searchParams.get("studentId");
    const usn = normalize(url.searchParams.get("usn"));
    const student = database.students.find(
      (item) => item.id === studentId || normalize(item.usn) === usn
    );

    if (!student) {
      sendError(response, 404, "Student not found.");
      return;
    }

    sendPdf(response, buildCertificate(database, student));
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/certificate/pdf/save") {
    const studentId = url.searchParams.get("studentId");
    const usn = normalize(url.searchParams.get("usn"));
    const student = database.students.find(
      (item) => item.id === studentId || normalize(item.usn) === usn
    );

    if (!student) {
      sendError(response, 404, "Student not found.");
      return;
    }

    sendJson(response, 200, {
      message: "PDF saved successfully.",
      pdf: savePdf(buildCertificate(database, student))
    });
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/downloads/")) {
    sendSavedPdf(response, decodeURIComponent(url.pathname.replace("/api/downloads/", "")));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/dues") {
    const body = await parseRequestBody(request);
    const semester = getSemester(database, body.semester);
    const subjectIndex = Number(body.subjectIndex);
    const studentIds = Array.isArray(body.studentIds) ? body.studentIds : [];
    const status = Boolean(body.status);

    if (!semester) {
      sendError(response, 404, "Semester not found.");
      return;
    }

    if (!Number.isInteger(subjectIndex) || subjectIndex < 0 || subjectIndex >= semester.subjects.length) {
      sendError(response, 400, "Faculty is not assigned to this semester subject.");
      return;
    }

    const updated = [];
    database.students.forEach((student) => {
      if (student.semester === semester.id && studentIds.includes(student.id)) {
        student.dues[subjectIndex] = status;
        updated.push(publicStudent(student));
      }
    });

    writeDatabase(database);
    sendJson(response, 200, {
      message: "Updated successfully.",
      updated
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/dues/sync") {
    const body = await parseRequestBody(request);
    const semester = getSemester(database, body.semester);
    const subjectIndex = Number(body.subjectIndex);
    const updates = Array.isArray(body.updates) ? body.updates : [];

    if (!semester) {
      sendError(response, 404, "Semester not found.");
      return;
    }

    if (!Number.isInteger(subjectIndex) || subjectIndex < 0 || subjectIndex >= semester.subjects.length) {
      sendError(response, 400, "Faculty is not assigned to this semester subject.");
      return;
    }

    const updateMap = new Map(updates.map((item) => [item.studentId, Boolean(item.status)]));
    const updated = [];

    database.students.forEach((student) => {
      if (student.semester === semester.id && updateMap.has(student.id)) {
        student.dues[subjectIndex] = updateMap.get(student.id);
        updated.push(publicStudent(student));
      }
    });

    writeDatabase(database);
    sendJson(response, 200, {
      message: "Updated successfully.",
      updated
    });
    return;
  }

  sendError(response, 404, "API route not found.");
}

function serveStatic(request, response, url) {
  let filePath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  filePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, "");

  const absolutePath = path.join(PUBLIC_DIR, filePath);

  if (!absolutePath.startsWith(PUBLIC_DIR)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(absolutePath, (error, content) => {
    if (error) {
      fs.readFile(path.join(PUBLIC_DIR, "index.html"), (indexError, indexContent) => {
        if (indexError) {
          response.writeHead(404);
          response.end("Not found");
          return;
        }

        response.writeHead(200, { "Content-Type": MIME_TYPES[".html"] });
        response.end(indexContent);
      });
      return;
    }

    const extension = path.extname(absolutePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(content);
  });
}

ensureDatabase();

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }

    serveStatic(request, response, url);
  } catch (error) {
    sendError(response, 500, error.message || "Internal server error.");
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use.`);
    console.error("Close the other running server, or start this app with a different PORT value.");
    console.error("Example: $env:PORT=3001; node server.js");
    process.exit(1);
  }

  throw error;
});

server.listen(PORT, () => {
  console.log(`Students No Due Certificate portal running at http://localhost:${PORT}`);
});
