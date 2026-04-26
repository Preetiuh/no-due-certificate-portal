const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "public");
const DB_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DB_DIR, "database.json");

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

server.listen(PORT, () => {
  console.log(`Students No Due Certificate portal running at http://localhost:${PORT}`);
});
