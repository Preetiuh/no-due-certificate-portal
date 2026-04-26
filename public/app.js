const state = {
  role: null,
  faculty: null,
  student: null,
  semesters: [],
  selectedSemester: "3",
  currentSemester: null,
  students: [],
  certificate: null,
  certificateBackScreen: "home-screen"
};

const screens = document.querySelectorAll(".screen");
const roleButtons = document.querySelectorAll("[data-role]");
const homeButtons = document.querySelectorAll("[data-action='home']");
const logoutButtons = document.querySelectorAll("[data-action='logout']");
const loginForm = document.querySelector("#login-form");
const loginTitle = document.querySelector("#login-title");
const loginRoleLabel = document.querySelector("#login-role-label");
const loginError = document.querySelector("#login-error");
const usernameInput = document.querySelector("#username");
const passwordInput = document.querySelector("#password");
const semesterSelect = document.querySelector("#semester-select");
const makeUpdatesButton = document.querySelector("#make-updates-button");
const studentsTableBody = document.querySelector("#students-table-body");
const semesterLabel = document.querySelector("#semester-label");
const facultySubjectLabel = document.querySelector("#faculty-subject-label");
const assignmentWarning = document.querySelector("#assignment-warning");
const selectAllButton = document.querySelector("#select-all-button");
const syncButton = document.querySelector("#sync-button");
const studentName = document.querySelector("#student-name");
const studentUsn = document.querySelector("#student-usn");
const studentCertificateButton = document.querySelector("#student-certificate-button");
const certificateContent = document.querySelector("#certificate-content");
const certificateBackButton = document.querySelector("#certificate-back-button");
const downloadPdfButton = document.querySelector("#download-pdf-button");
const printButton = document.querySelector("#print-button");
const pdfStatus = document.querySelector("#pdf-status");
const toast = document.querySelector("#toast");

function showScreen(screenId) {
  screens.forEach((screen) => {
    screen.classList.toggle("active", screen.id === screenId);
  });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Something went wrong.");
  }

  return payload;
}

function resetLoginForm(role) {
  state.role = role;
  loginError.textContent = "";
  usernameInput.value = "";
  passwordInput.value = "";
  loginRoleLabel.textContent = role === "faculty" ? "Faculty Login" : "Student Login";
  loginTitle.textContent = role === "faculty" ? "Faculty Portal Login" : "Student Portal Login";
  showScreen("login-screen");
  usernameInput.focus();
}

function logout() {
  state.role = null;
  state.faculty = null;
  state.student = null;
  state.students = [];
  state.currentSemester = null;
  state.certificate = null;
  showScreen("home-screen");
}

function renderFacultyDashboard() {
  document.querySelector("#faculty-welcome").textContent = `Welcome, ${titleCase(state.faculty.name)}`;
  semesterSelect.innerHTML = state.semesters
    .map((semester) => `<option value="${escapeHtml(semester.id)}">${escapeHtml(semester.label)}</option>`)
    .join("");
  semesterSelect.value = state.selectedSemester;
  showScreen("faculty-dashboard-screen");
}

async function handleLogin(event) {
  event.preventDefault();
  loginError.textContent = "";

  const submitButton = loginForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "Logging in...";

  try {
    const payload = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({
        role: state.role,
        username: usernameInput.value,
        password: passwordInput.value
      })
    });

    if (payload.role === "faculty") {
      state.faculty = payload.user;
      state.semesters = payload.semesters;
      renderFacultyDashboard();
      return;
    }

    state.student = payload.user;
    state.certificate = payload.certificate;
    renderStudentDashboard();
  } catch (error) {
    loginError.textContent = error.message;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Login";
  }
}

function renderStudentDashboard() {
  studentName.textContent = state.student.name;
  studentUsn.textContent = state.student.usn;
  showScreen("student-dashboard-screen");
}

async function loadFacultyStudents() {
  state.selectedSemester = semesterSelect.value;
  makeUpdatesButton.disabled = true;
  makeUpdatesButton.textContent = "Loading...";

  try {
    const payload = await api(`/api/students?semester=${encodeURIComponent(state.selectedSemester)}`);
    state.currentSemester = payload.semester;
    state.students = payload.students;
    renderFacultyStudents();
    showScreen("faculty-updates-screen");
  } catch (error) {
    showToast(error.message);
  } finally {
    makeUpdatesButton.disabled = false;
    makeUpdatesButton.textContent = "Make Updates";
  }
}

function renderFacultyStudents() {
  const subject = getAssignedSubject();
  const hasAssignment = Boolean(subject);

  semesterLabel.textContent = state.currentSemester.label;
  facultySubjectLabel.textContent = hasAssignment
    ? `${titleCase(state.faculty.name)} updates ${subject.code} - ${subject.name}`
    : `${titleCase(state.faculty.name)} is not assigned to this semester.`;
  assignmentWarning.textContent = hasAssignment
    ? ""
    : "This faculty has no subject in the selected semester, so status updates are disabled.";
  assignmentWarning.classList.toggle("active", !hasAssignment);

  const allSelected = hasAssignment && state.students.length > 0 && state.students.every((student) => isStudentSigned(student));
  selectAllButton.disabled = !hasAssignment || state.students.length === 0;
  selectAllButton.classList.toggle("is-checked", allSelected);
  selectAllButton.querySelector("span:last-child").textContent = allSelected ? "Unselect All" : "Select All";
  syncButton.disabled = !hasAssignment || state.students.length === 0;

  studentsTableBody.innerHTML = state.students
    .map((student) => {
      const checked = hasAssignment && isStudentSigned(student);
      return `
        <tr>
          <td>${escapeHtml(student.name)}</td>
          <td>${escapeHtml(student.usn)}</td>
          <td>
            <button class="secondary-button" type="button" data-view-certificate="${escapeHtml(student.id)}">
              View Certificate
            </button>
          </td>
          <td>
            <button
              class="tick-button ${checked ? "is-checked" : ""}"
              type="button"
              data-toggle-student="${escapeHtml(student.id)}"
              aria-label="${checked ? "Clear status" : "Mark status"} for ${escapeHtml(student.name)}"
              ${hasAssignment ? "" : "disabled"}
            >
              <span class="tick-box" aria-hidden="true"></span>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function getAssignedSubject() {
  if (!state.currentSemester || !state.faculty) return null;
  return state.currentSemester.subjects[state.faculty.subjectIndex] || null;
}

function isStudentSigned(student) {
  return Boolean(student.dues[state.faculty.subjectIndex]);
}

function updateLocalStudents(updatedStudents) {
  const updatedById = new Map(updatedStudents.map((student) => [student.id, student]));
  state.students = state.students.map((student) => updatedById.get(student.id) || student);
}

async function setDueStatus(studentIds, status, options = {}) {
  const subject = getAssignedSubject();
  if (!subject) return;

  const previousStudents = structuredClone(state.students);
  state.students = state.students.map((student) => {
    if (!studentIds.includes(student.id)) return student;
    const dues = [...student.dues];
    dues[state.faculty.subjectIndex] = status;
    return { ...student, dues };
  });
  renderFacultyStudents();

  try {
    const payload = await api("/api/dues", {
      method: "POST",
      body: JSON.stringify({
        semester: state.currentSemester.id,
        subjectIndex: state.faculty.subjectIndex,
        studentIds,
        status
      })
    });
    updateLocalStudents(payload.updated);
    renderFacultyStudents();
    if (!options.silent) {
      showToast("Updated successfully.");
    }
  } catch (error) {
    state.students = previousStudents;
    renderFacultyStudents();
    showToast(error.message);
  }
}

async function syncCurrentStatuses() {
  const subject = getAssignedSubject();
  if (!subject) return;

  syncButton.disabled = true;
  syncButton.textContent = "Updating...";

  try {
    const payload = await api("/api/dues/sync", {
      method: "POST",
      body: JSON.stringify({
        semester: state.currentSemester.id,
        subjectIndex: state.faculty.subjectIndex,
        updates: state.students.map((student) => ({
          studentId: student.id,
          status: isStudentSigned(student)
        }))
      })
    });
    updateLocalStudents(payload.updated);
    renderFacultyStudents();
    showToast("Updated successfully.");
  } catch (error) {
    showToast(error.message);
  } finally {
    syncButton.disabled = false;
    syncButton.textContent = "Update";
  }
}

async function loadCertificate(studentId, backScreen) {
  try {
    const payload = await api(`/api/certificate?studentId=${encodeURIComponent(studentId)}`);
    state.certificate = payload.certificate;
    state.certificateBackScreen = backScreen;
    pdfStatus.classList.remove("active");
    pdfStatus.innerHTML = "";
    renderCertificate();
    showScreen("certificate-screen");
  } catch (error) {
    showToast(error.message);
  }
}

function renderCertificate() {
  const certificate = state.certificate;
  if (!certificate) return;

  certificateContent.innerHTML = `
    <div class="certificate-header">
      <div class="certificate-seal">GSSS</div>
      <div>
        <h2>${escapeHtml(certificate.institute)}</h2>
        <h3>${escapeHtml(certificate.department)}</h3>
        <h4>${escapeHtml(certificate.title)}</h4>
      </div>
    </div>
    <div class="certificate-info">
      <div>
        <span>Student Name</span>
        <strong>${escapeHtml(certificate.student.name)}</strong>
      </div>
      <div>
        <span>USN</span>
        <strong>${escapeHtml(certificate.student.usn)}</strong>
      </div>
      <div>
        <span>Semester</span>
        <strong>${escapeHtml(certificate.student.semester)}</strong>
      </div>
    </div>
    <div class="table-wrap">
      <table class="certificate-table">
        <thead>
          <tr>
            <th>Subject Code</th>
            <th>Subject Name</th>
            <th>Faculty Name</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${certificate.subjects
            .map(
              (subject) => `
                <tr>
                  <td>${escapeHtml(subject.code)}</td>
                  <td>${escapeHtml(subject.name)}</td>
                  <td>${escapeHtml(titleCase(subject.faculty))}</td>
                  <td>
                    <span class="tick-box ${subject.status ? "is-checked" : ""}" aria-label="${subject.status ? "Completed" : "Pending"}"></span>
                  </td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
    <div class="certificate-footer">
      <div class="signature-line">Mentor Signature</div>
      <div class="signature-line">HOD Signature</div>
    </div>
  `;
}

async function downloadCertificatePdf() {
  if (!state.certificate) return;

  downloadPdfButton.disabled = true;
  downloadPdfButton.textContent = "Saving...";

  try {
    const payload = await api(`/api/certificate/pdf/save?studentId=${encodeURIComponent(state.certificate.student.id)}`);
    const url = payload.pdf.url;
    const filePath = payload.pdf.filePath;

    pdfStatus.innerHTML = `
      PDF saved successfully.
      <a href="${escapeHtml(url)}" target="_blank" rel="noopener">Open PDF</a>
      <span>${escapeHtml(filePath)}</span>
    `;
    pdfStatus.classList.add("active");
    showToast("PDF saved successfully.");
  } catch (error) {
    showToast(error.message);
  } finally {
    downloadPdfButton.disabled = false;
    downloadPdfButton.textContent = "Download PDF";
  }
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
  return pdf;
}

function pdfEscape(value) {
  return String(value).replace(/[\\()]/g, "\\$&");
}

function titleCase(value) {
  return String(value)
    .split(" ")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

roleButtons.forEach((button) => {
  button.addEventListener("click", () => resetLoginForm(button.dataset.role));
});

homeButtons.forEach((button) => {
  button.addEventListener("click", logout);
});

logoutButtons.forEach((button) => {
  button.addEventListener("click", logout);
});

document.querySelector("[data-action='faculty-dashboard']").addEventListener("click", () => {
  showScreen("faculty-dashboard-screen");
});

loginForm.addEventListener("submit", handleLogin);
makeUpdatesButton.addEventListener("click", loadFacultyStudents);

studentsTableBody.addEventListener("click", (event) => {
  const certificateButton = event.target.closest("[data-view-certificate]");
  if (certificateButton) {
    loadCertificate(certificateButton.dataset.viewCertificate, "faculty-updates-screen");
    return;
  }

  const toggleButton = event.target.closest("[data-toggle-student]");
  if (toggleButton) {
    const student = state.students.find((item) => item.id === toggleButton.dataset.toggleStudent);
    if (student) {
      setDueStatus([student.id], !isStudentSigned(student));
    }
  }
});

selectAllButton.addEventListener("click", () => {
  const subject = getAssignedSubject();
  if (!subject) return;

  const allSelected = state.students.length > 0 && state.students.every((student) => isStudentSigned(student));
  const nextStatus = !allSelected;
  if (nextStatus) {
    selectAllButton.classList.remove("flash");
    void selectAllButton.offsetWidth;
    selectAllButton.classList.add("flash");
  }
  setDueStatus(
    state.students.map((student) => student.id),
    nextStatus
  );
});

syncButton.addEventListener("click", syncCurrentStatuses);

studentCertificateButton.addEventListener("click", () => {
  loadCertificate(state.student.id, "student-dashboard-screen");
});

certificateBackButton.addEventListener("click", () => {
  showScreen(state.certificateBackScreen);
});

downloadPdfButton.addEventListener("click", downloadCertificatePdf);
printButton.addEventListener("click", () => window.print());
