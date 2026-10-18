
"use strict";

// ============================================
// 1. STORAGE AND PAGE SETUP
// ============================================

const STORAGE_KEY = "carepoint_demo_patients_v2";

const NURSE_LOGIN_KEY = "carepoint_nurse_login";
const NURSE_INFO_KEY = "carepoint_nurse";
const LATEST_PATIENT_KEY = "carepoint_latest";

const DEMO_WAIT_MINUTES = 40;

const getElement = (id) => document.getElementById(id);

const page = document.body.dataset.page;


// ============================================
// 2. PATIENT DATA
// ============================================

function getPatients() {
    try {
        const patients = JSON.parse(
            localStorage.getItem(STORAGE_KEY) || "[]"
        );

        return Array.isArray(patients) ? patients : [];
    } catch (error) {
        console.error("Could not load patients:", error);
        return [];
    }
}

function savePatients(patients) {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(patients)
    );
}


// ============================================
// 3. NURSE SESSION
// ============================================

function isNurseLoggedIn() {
    return sessionStorage.getItem(NURSE_LOGIN_KEY) === "yes";
}

function getSavedNurse() {
    try {
        const nurse = JSON.parse(
            sessionStorage.getItem(NURSE_INFO_KEY) || "null"
        );

        if (
            nurse &&
            nurse.first &&
            nurse.last &&
            nurse.shift
        ) {
            return nurse;
        }

        return null;
    } catch (error) {
        return null;
    }
}


// ============================================
// 4. GENERAL HELPER FUNCTIONS
// ============================================

function createDetail(label, value) {
    const paragraph = document.createElement("p");
    const heading = document.createElement("strong");

    heading.textContent = `${label}: `;

    paragraph.append(
        heading,
        document.createTextNode(value ?? "—")
    );

    return paragraph;
}

function formatTime(date) {
    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
    });
}

function localDate(date) {
    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function addCell(row, value) {
    const cell = document.createElement("td");

    cell.textContent = value ?? "—";

    row.append(cell);

    return cell;
}

function getDuration(patient) {
    const savedDuration = Number(
        patient.durationMinutes
    );

    if (
        Number.isFinite(savedDuration) &&
        savedDuration >= 5 &&
        savedDuration <= 240
    ) {
        return savedDuration;
    }

    const oldDuration = parseInt(patient.time, 10);

    if (
        Number.isFinite(oldDuration) &&
        oldDuration > 0
    ) {
        return oldDuration;
    }

    return 20;
}


// ============================================
// 5. LIVE ESTIMATED WAIT TIME
// ============================================

// This is a classroom simulation, not a
// real hospital wait-time prediction.

function getRemainingSeconds(patient) {
    const checkInTime = new Date(
        patient.created
    ).getTime();

    if (!Number.isFinite(checkInTime)) {
        return 0;
    }

    const estimatedEnd =
        checkInTime + DEMO_WAIT_MINUTES * 60 * 1000;

    return Math.max(
        0,
        Math.ceil((estimatedEnd - Date.now()) / 1000)
    );
}

function formatWait(seconds) {
    if (seconds <= 0) {
        return "Estimate reached";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return (
        `${minutes}m ` +
        `${String(remainingSeconds).padStart(2, "0")}s`
    );
}


// ============================================
// 6. PATIENT CHECK-IN
// ============================================

function initializePatientForm() {
    const form = getElement("patientForm");

    if (!form) {
        return;
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        if (!form.reportValidity()) {
            return;
        }

        const values = Object.fromEntries(
            new FormData(form)
        );

        // Record the device's current time.
        const now = new Date();

        const patient = {
            ...values,

            id: `CP-${Date.now().toString(36).toUpperCase()}`,

            arrival: formatTime(now),

            created: now.toISOString(),

            status: "Waiting",

            nurse: "Not assigned",

            wait: `${DEMO_WAIT_MINUTES} minutes (demo)`,

            time: "20 minutes (demo)",

            durationMinutes: 20
        };

        const patients = getPatients();

        patients.push(patient);

        savePatients(patients);

        sessionStorage.setItem(
            LATEST_PATIENT_KEY,
            patient.id
        );

        window.location.href = "patient-output.html";
    });
}


// ============================================
// 7. PATIENT CONFIRMATION
// ============================================

function initializeConfirmation() {
    const details = getElement(
        "confirmationDetails"
    );

    if (!details) {
        return;
    }

    const latestId = sessionStorage.getItem(
        LATEST_PATIENT_KEY
    );

    const patient = getPatients().find(
        (item) => item.id === latestId
    );

    if (!patient) {
        details.textContent =
            "No recent check-in found. Please complete the patient form first.";

        return;
    }

    details.className = "details";
    details.replaceChildren();

    const fields = [
        [
            "Patient",
            `${patient.first} ${patient.last}`
        ],
        [
            "Check-in time (device)",
            patient.arrival
        ],
        [
            "Estimated wait time",
            patient.status === "Waiting"
                ? formatWait(getRemainingSeconds(patient))
                : "—"
        ],
        [
            "Temporary Patient ID #",
            patient.id
        ],
        [
            "Assigned nurse",
            patient.nurse
        ],
        [
            "Status",
            patient.status
        ]
    ];

    fields.forEach(([label, value]) => {
        details.append(
            createDetail(label, value)
        );
    });
}


// ============================================
// 8. HOMEPAGE WAITING LIST
// ============================================

function initializeHomeWaitlist() {
    const list = getElement("homeWaitlist");
    const summary = getElement("queueSummary");

    if (!list || !summary) {
        return;
    }

    function renderWaitlist() {
        const waitingPatients = getPatients()
            .filter((patient) => {
                return patient.status === "Waiting";
            })
            .sort((a, b) => {
                return new Date(a.created) -
                    new Date(b.created);
            });

        list.replaceChildren();

        const count = waitingPatients.length;

        summary.textContent =
            `${count} patient(s) currently waiting.`;

        // Hide the numbered list when empty.
        if (count === 0) {
            list.hidden = true;
            return;
        }

        list.hidden = false;

        waitingPatients.forEach((patient, index) => {
            const item = document.createElement("li");

            const ahead = index;

            item.textContent =
                `${patient.id} — Waiting — ` +
                `${ahead} patient(s) ahead`;

            list.append(item);
        });
    }

    renderWaitlist();

    window.addEventListener(
        "storage",
        renderWaitlist
    );

    window.addEventListener(
        "pageshow",
        renderWaitlist
    );
}


// ============================================
// 9. NURSE LOGIN OPTIONS
// ============================================

function showNurseLoginChoices() {
    const choices = getElement("loginChoices");
    const form = getElement("loginForm");

    if (!choices || !form) {
        return;
    }

    const nurse = getSavedNurse();

    form.hidden = true;
    choices.hidden = false;

    const myPatients = getElement(
        "viewMyPatients"
    );

    const waitingPatients = getElement(
        "viewWaitingPatients"
    );

    const publicWaitlist = getElement(
        "viewPublicWaitlist"
    );

    if (myPatients) {
        myPatients.hidden = !nurse;
    }

    if (waitingPatients) {
        waitingPatients.hidden = !nurse;
    }

    if (publicWaitlist) {
        publicWaitlist.hidden = Boolean(nurse);
    }

    const message = getElement(
        "savedShiftMessage"
    );

    if (message) {
        if (nurse) {
            message.textContent =
                `Current shift: ${nurse.first} ` +
                `${nurse.last} — ${nurse.shift}`;
        } else {
            message.textContent =
                "Start your shift to access the nurse dashboard, or view the public waiting list.";
        }
    }
}


// ============================================
// 10. NURSE SIGN-IN
// ============================================

function initializeLogin() {
    const form = getElement("loginForm");

    if (!form) {
        return;
    }

    if (isNurseLoggedIn()) {
        showNurseLoginChoices();
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const username = getElement(
            "username"
        ).value.trim();

        const password = getElement(
            "password"
        ).value;

        const errorMessage = getElement(
            "loginError"
        );

        if (
            username === "nurse" &&
            password === "demo123"
        ) {
            sessionStorage.setItem(
                NURSE_LOGIN_KEY,
                "yes"
            );

            if (errorMessage) {
                errorMessage.textContent = "";
            }

            showNurseLoginChoices();
        } else {
            if (errorMessage) {
                errorMessage.textContent =
                    "Incorrect username or password.";
            }
        }
    });
}


// ============================================
// 11. NURSE SHIFT INFORMATION
// ============================================

function initializeNurseInput() {
    if (!isNurseLoggedIn()) {
        window.location.replace(
            "nurse-login.html"
        );

        return;
    }

    const form = getElement("nurseForm");

    if (!form) {
        return;
    }

    const savedNurse = getSavedNurse();

    // Pre-fill existing shift information.
    if (savedNurse) {
        form.elements["first"].value =
            savedNurse.first;

        form.elements["last"].value =
            savedNurse.last;

        form.elements["shift"].value =
            savedNurse.shift;
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        if (!form.reportValidity()) {
            return;
        }

        const values = Object.fromEntries(
            new FormData(form)
        );

        sessionStorage.setItem(
            NURSE_INFO_KEY,
            JSON.stringify(values)
        );

        window.location.href =
            "nurse-dashboard.html";
    });
}


// ============================================
// 12. NURSE DASHBOARD
// ============================================

function initializeDashboard() {
    const nurse = getSavedNurse();

    if (!isNurseLoggedIn() || !nurse) {
        window.location.replace(
            "nurse-login.html"
        );

        return;
    }

    const nurseName =
        `${nurse.first} ${nurse.last}`;

    const view = new URLSearchParams(
        window.location.search
    ).get("view") || "all";

    const viewTitles = {
        all: "All Patients",
        waiting: "Waiting Patients",
        completed: "Completed Patients",
        mine: "My Assigned Patients"
    };

    getElement("nurseGreeting").textContent =
        `Welcome, ${nurseName}`;

    getElement("shiftInfo").textContent =
        `Current shift: ${nurse.shift}`;

    getElement("patientListTitle").textContent =
        viewTitles[view] || viewTitles.all;

    // Today's date for the calendar.
    const scheduleDate = getElement(
        "scheduleDate"
    );

    scheduleDate.value = localDate(
        new Date()
    );


    // ----------------------------------------
    // UPDATE LIVE WAIT TIMES
    // ----------------------------------------

    function updateLiveWaits() {
        const patients = getPatients();

        const waitCells = document.querySelectorAll(
            "[data-wait-id]"
        );

        waitCells.forEach((cell) => {
            const patient = patients.find(
                (item) => {
                    return item.id === cell.dataset.waitId;
                }
            );

            if (!patient) {
                cell.textContent = "—";
                return;
            }

            if (patient.status === "Waiting") {
                cell.textContent = formatWait(
                    getRemainingSeconds(patient)
                );
            } else {
                cell.textContent = "—";
            }
        });
    }


    // ----------------------------------------
    // ASSIGNMENT CALENDAR
    // ----------------------------------------

    function renderSchedule(patients) {
        const rows = getElement(
            "scheduleRows"
        );

        rows.replaceChildren();

        const selectedDate = scheduleDate.value;

        const assigned = patients
            .filter((patient) => {
                return patient.nurse === nurseName;
            })
            .filter((patient) => {
                const created = new Date(
                    patient.created
                );

                return (
                    localDate(created) === selectedDate
                );
            })
            .sort((a, b) => {
                return new Date(a.created) -
                    new Date(b.created);
            });

        // Simulated sequential schedule.
        let nextAvailable = null;

        assigned.forEach((patient) => {
            const row = document.createElement("tr");

            const checkIn = new Date(
                patient.created
            );

            const duration = getDuration(
                patient
            );

            if (
                !nextAvailable ||
                checkIn > nextAvailable
            ) {
                nextAvailable = new Date(checkIn);
            }

            const estimatedStart = new Date(
                nextAvailable
            );

            nextAvailable = new Date(
                estimatedStart.getTime() +
                duration * 60000
            );

            addCell(
                row,
                `${patient.first} ${patient.last}`
            );

            addCell(
                row,
                formatTime(checkIn)
            );

            addCell(
                row,
                formatTime(estimatedStart)
            );

            addCell(
                row,
                `${duration} minutes`
            );

            addCell(
                row,
                patient.status
            );

            rows.append(row);
        });

        getElement("scheduleEmpty").hidden =
            assigned.length > 0;
    }


    // ----------------------------------------
    // WORKLOAD AND SCHEDULES
    // ----------------------------------------

    function renderWorkload(patients) {
        const assigned = patients.filter(
            (patient) => {
                return patient.nurse === nurseName;
            }
        );

        const active = assigned.filter(
            (patient) => {
                return patient.status !== "Completed";
            }
        );

        const completed = assigned.filter(
            (patient) => {
                return patient.status === "Completed";
            }
        );

        const remainingMinutes = active.reduce(
            (total, patient) => {
                return total + getDuration(patient);
            },
            0
        );

        getElement("assignedCount").textContent =
            assigned.length;

        getElement("activeCount").textContent =
            active.length;

        getElement("shiftCompleted").textContent =
            completed.length;

        getElement("scheduledMinutes").textContent =
            `${remainingMinutes} min`;

        getElement("workload").textContent =
            `You have ${active.length} unfinished ` +
            `patient assignment(s).`;
    }


    // ----------------------------------------
    // PATIENT TABLE
    // ----------------------------------------

    function renderPatients() {
        const patients = getPatients();

        const query = getElement("search")
            .value
            .trim()
            .toLowerCase();

        const rows = getElement(
            "patientRows"
        );

        rows.replaceChildren();

        // Overall patient statistics.
        getElement("total").textContent =
            patients.length;

        getElement("waiting").textContent =
            patients.filter((patient) => {
                return patient.status === "Waiting";
            }).length;

        getElement("completed").textContent =
            patients.filter((patient) => {
                return patient.status === "Completed";
            }).length;


        // Filter according to the selected card.
        const filtered = patients.filter(
            (patient) => {
                if (view === "mine") {
                    return patient.nurse === nurseName;
                }

                if (view === "waiting") {
                    return patient.status === "Waiting";
                }

                if (view === "completed") {
                    return patient.status === "Completed";
                }

                return true;
            }
        );


        // Search by patient name or ID.
        const matches = filtered.filter(
            (patient) => {
                const searchable =
                    `${patient.first} ` +
                    `${patient.last} ` +
                    `${patient.id}`;

                return searchable
                    .toLowerCase()
                    .includes(query);
            }
        );

        // Display in check-in order.
        matches.sort((a, b) => {
            return new Date(a.created) -
                new Date(b.created);
        });


        // Build each patient row.
        matches.forEach((patient) => {
            const row = document.createElement("tr");

            addCell(
                row,
                `${patient.first} ${patient.last} ` +
                `(${patient.id})`
            );

            // Check-in time.
            const created = new Date(
                patient.created
            );

            addCell(
                row,
                formatTime(created)
            );

            // Reason for visit.
            addCell(
                row,
                patient.reason
            );


            // --------------------------------
            // URGENCY (DEMO ONLY)
            // --------------------------------

            const pain = Number(patient.pain);

            let urgency = "Low (demo)";

            if (pain >= 7) {
                urgency = "High (demo)";
            } else if (pain >= 4) {
                urgency = "Medium (demo)";
            }

            addCell(row, urgency);


            // --------------------------------
            // PATIENT STATUS
            // --------------------------------

            const statusCell = addCell(
                row,
                ""
            );

            const statusSelect =
                document.createElement("select");

            statusSelect.setAttribute(
                "aria-label",
                `Status for ${patient.id}`
            );

            const statuses = [
                "Waiting",
                "In Progress",
                "Completed"
            ];

            statuses.forEach((status) => {
                const option =
                    document.createElement("option");

                option.value = status;
                option.textContent = status;

                statusSelect.append(option);
            });

            statusSelect.value = patient.status;

            statusSelect.addEventListener(
                "change",
                () => {
                    patient.status =
                        statusSelect.value;

                    savePatients(patients);

                    renderPatients();
                }
            );

            statusCell.append(
                statusSelect
            );


            // --------------------------------
            // LIVE ESTIMATED WAIT
            // --------------------------------

            const waitCell = addCell(
                row,
                ""
            );

            waitCell.dataset.waitId =
                patient.id;


            // --------------------------------
            // TIME WITH PATIENT
            // --------------------------------

            const durationCell = addCell(
                row,
                ""
            );

            const durationInput =
                document.createElement("input");

            durationInput.type = "number";
            durationInput.min = "5";
            durationInput.max = "240";
            durationInput.step = "5";

            durationInput.value =
                getDuration(patient);

            durationInput.setAttribute(
                "aria-label",
                `Appointment minutes for ${patient.id}`
            );

            durationInput.addEventListener(
                "change",
                () => {
                    const duration = Number(
                        durationInput.value
                    );

                    if (
                        !Number.isFinite(duration) ||
                        duration < 5 ||
                        duration > 240
                    ) {
                        durationInput.value =
                            getDuration(patient);

                        return;
                    }

                    patient.durationMinutes =
                        duration;

                    patient.time =
                        `${duration} minutes (demo)`;

                    savePatients(patients);

                    renderSchedule(patients);
                    renderWorkload(patients);
                }
            );

            durationCell.append(
                durationInput
            );


            // --------------------------------
            // ASSIGNED NURSE
            // --------------------------------

            const nurseCell = addCell(
                row,
                ""
            );

            const assignButton =
                document.createElement("button");

            if (
                patient.nurse === "Not assigned" ||
                !patient.nurse
            ) {
                assignButton.textContent =
                    "Assign to me";
            } else {
                assignButton.textContent =
                    `Assigned: ${patient.nurse}`;
            }

            assignButton.addEventListener(
                "click",
                () => {
                    patient.nurse = nurseName;

                    savePatients(patients);

                    renderPatients();
                }
            );

            nurseCell.append(
                assignButton
            );

            rows.append(row);
        });


        // Empty patient list message.
        getElement("empty").hidden =
            rows.children.length > 0;

        renderSchedule(patients);

        renderWorkload(patients);

        updateLiveWaits();
    }


    // ----------------------------------------
    // DASHBOARD EVENT LISTENERS
    // ----------------------------------------

    getElement("search").addEventListener(
        "input",
        renderPatients
    );

    scheduleDate.addEventListener(
        "change",
        () => {
            renderSchedule(getPatients());
        }
    );

    getElement("logout").addEventListener(
        "click",
        () => {
            sessionStorage.removeItem(
                NURSE_LOGIN_KEY
            );

            window.location.href =
                "index.html";
        }
    );

    window.addEventListener(
        "storage",
        renderPatients
    );

    // Initial dashboard load.
    renderPatients();

    // Refresh countdown every second.
    setInterval(
        updateLiveWaits,
        1000
    );
}


// ============================================
// 13. PAGE INITIALIZATION
// ============================================

// Run only the code required by the current page.

switch (page) {
    case "home":
        initializeHomeWaitlist();
        break;

    case "patient":
        initializePatientForm();
        break;

    case "confirmation":
        initializeConfirmation();
        break;

    case "login":
        initializeLogin();
        break;

    case "nurse-input":
        initializeNurseInput();
        break;

    case "dashboard":
        initializeDashboard();
        break;

    default:
        break;
}
