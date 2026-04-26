# Students No Due Certificate Portal

A complete web project for managing semester-end student no due certificates for the Department Of Artificial Intelligence And Data Science.

## Project Structure

```text
students-no-due-certificate/
├── data/
│   └── database.json
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── package.json
├── README.md
└── server.js
```

## Run The Project

```bash
node server.js
```

Open:

```text
http://localhost:3000
```

## Login Details

Faculty usernames and passwords are the same:

```text
faculty 1
faculty 2
faculty 3
faculty 4
faculty 5
faculty 6
faculty 7
faculty 8
faculty 9
```

Student usernames and passwords are also the same as the student name. Examples:

```text
Aishwarya K
Ananya Rao
Janhavi S
Oviya S
Vaishnavi S
Charitha S
```

## Features

- Faculty and student login.
- Semester selection from 3rd to 8th semester.
- Faculty-wise status updates with green tick icons.
- Select All and Unselect All with a green animation.
- Automatic backend update whenever faculty selects or unselects a student.
- Manual Update button with success popup.
- Student certificate view with subject code, subject name, faculty name, and status.
- Professional certificate layout.
- PDF download and print options.
- Seeded database with 5 students per semester and 9 faculty users.
