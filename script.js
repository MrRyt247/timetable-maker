let currentOrientation = "portrait";
let courses = [];
let locations = [];
let placedCourses = [];
const allDays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
let selectedDays = [0, 1, 2, 3, 4]; // Default: weekdays

$(document).ready(function () {
  generateTimetable();
  setupOrientationToggle();
  setupColorInputs();
  setupDayCheckboxes();
  setupSidebarResize();
});

function toggleSection(header) {
  const section = $(header).parent();
  const content = section.find(".section-content");
  const toggle = section.find(".section-toggle");

  content.toggleClass("collapsed");
  toggle.toggleClass("collapsed");
}

function setupSidebarResize() {
  $(".sidebar").resizable({
    handles: window.innerWidth <= 768 ? "s" : "e",
    minWidth: 250,
    maxWidth: 500,
    minHeight: 200,
  });
}

function setupOrientationToggle() {
  $(".toggle-btn").click(function () {
    $(".toggle-btn").removeClass("active");
    $(this).addClass("active");
    currentOrientation = $(this).data("orientation");
    generateTimetable();
  });
}

function setupColorInputs() {
  $(".color-input").on("change", function () {
    applyColors();
  });
}

function setupDayCheckboxes() {
  $('input[type="checkbox"][id^="day-"]').change(function () {
    selectedDays = [];
    $('input[type="checkbox"][id^="day-"]:checked').each(function () {
      selectedDays.push(parseInt($(this).val()));
    });
    selectedDays.sort((a, b) => a - b);
  });
}

function generateTimetable() {
  const startTime = $("#start-time").val();
  const endTime = $("#end-time").val();
  const duration = parseInt($("#time-duration").val());

  const start = new Date(`2024-01-01T${startTime}:00`);
  const end = new Date(`2024-01-01T${endTime}:00`);

  const timeSlots = [];
  let current = new Date(start);

  while (current < end) {
    const next = new Date(current.getTime() + duration * 60000);
    timeSlots.push({
      start: current.toTimeString().slice(0, 5),
      end: next.toTimeString().slice(0, 5),
    });
    current = next;
  }

  const activeDays = selectedDays.map((index) => allDays[index]);
  let html = "";

  if (currentOrientation === "portrait") {
    // Days as columns
    html += '<div class="timetable-row">';
    html += '<div class="timetable-cell time-header">Time</div>';
    activeDays.forEach((day, index) => {
      html += `<div class="timetable-cell day-header">${day}</div>`;
    });
    html += "</div>";

    timeSlots.forEach((slot, timeIndex) => {
      html += '<div class="timetable-row">';
      html += `<div class="timetable-cell time-header" ondblclick="editTimeSlot(this, ${timeIndex})">${slot.start}<br>${slot.end}</div>`;
      selectedDays.forEach((dayIndex, arrayIndex) => {
        html += `<div class="timetable-cell time-slot" data-day="${dayIndex}" data-time="${timeIndex}" ondblclick="editTimeSlot(this, ${timeIndex})"></div>`;
      });
      html += "</div>";
    });
  } else {
    // Days as rows
    html += '<div class="timetable-row">';
    html += '<div class="timetable-cell day-header">Day</div>';
    timeSlots.forEach((slot, index) => {
      html += `<div class="timetable-cell time-header" ondblclick="editTimeSlot(this, ${index})">${slot.start}<br>${slot.end}</div>`;
    });
    html += "</div>";

    selectedDays.forEach((dayIndex, arrayIndex) => {
      const day = allDays[dayIndex];
      html += '<div class="timetable-row">';
      html += `<div class="timetable-cell day-header">${day}</div>`;
      timeSlots.forEach((slot, timeIndex) => {
        html += `<div class="timetable-cell day-slot" data-day="${dayIndex}" data-time="${timeIndex}" ondblclick="editTimeSlot(this, ${timeIndex})"></div>`;
      });
      html += "</div>";
    });
  }

  $("#timetable").html(html);
  setupDroppable();
  restorePlacedCourses();
  applyColors();
}

function editTimeSlot(element, timeIndex) {
  if ($(element).hasClass("editing")) return;

  $(element).addClass("editing");
  const currentTime =
    $(element).text().split("\n")[0] || $(element).text().split("<br>")[0];

  const input = $(
    `<input type="time" class="time-edit-input" value="${currentTime}">`
  );
  $(element).append(input);

  input.focus().select();

  input.on("blur keypress", function (e) {
    if (e.type === "keypress" && e.which !== 13) return;

    const newTime = $(this).val();
    if (newTime) {
      updateTimeSlot(timeIndex, newTime);
    }

    $(this).remove();
    $(element).removeClass("editing");
  });
}

function updateTimeSlot(timeIndex, newStartTime) {
  const duration = parseInt($("#time-duration").val());
  const startDate = new Date(`2024-01-01T${newStartTime}:00`);
  const endDate = new Date(startDate.getTime() + duration * 60000);

  const newEndTime = endDate.toTimeString().slice(0, 5);

  // Update all time headers for this slot
  $(".time-header").each(function () {
    const $this = $(this);
    if ($this.text().includes("\n") || $this.html().includes("<br>")) {
      const parts = $this.html().split("<br>");
      if (parts.length === 2) {
        const cellTimeIndex = $this.closest(".timetable-row").index() - 1;
        if (cellTimeIndex === timeIndex) {
          $this.html(`${newStartTime}<br>${newEndTime}`);
        }
      }
    }
  });

  // Also update start time input if it matches
  if (timeIndex === 0) {
    $("#start-time").val(newStartTime);
  }
}

function setupDroppable() {
  $(".time-slot, .day-slot").droppable({
    accept: ".course-box, .placed-course",
    hoverClass: "drop-zone",
    drop: function (event, ui) {
      const courseElement = ui.draggable;
      const courseId = courseElement.data("course-id");
      const dayIndex = $(this).data("day");
      const timeIndex = $(this).data("time");

      // Remove from previous position if it was placed
      placedCourses = placedCourses.filter((c) => c.id !== courseId);

      // Add to new position
      const course = courses.find((c) => c.id === courseId);
      if (course) {
        placedCourses.push({
          id: courseId,
          name: course.name,
          location: course.location || "",
          day: dayIndex,
          time: timeIndex,
        });

        // Update the cell
        updateCell($(this), course);

        // Reset the draggable element
        courseElement.css({
          position: "relative",
          top: "auto",
          left: "auto",
        });
      }
    },
  });
}

function updateCell(cell, course) {
  cell.html(`
        <div class="placed-course" data-course-id="${course.id}">
          <div class="course-name">${course.name}</div>
          <div class="course-location">${course.location || ""}</div>
          <button class="remove-btn" onclick="removePlacedCourse(${
            course.id
          })">&times;</button>
        </div>
      `);

  // Make the placed course draggable and resizable
  const placedCourse = cell.find(".placed-course");
  placedCourse
    .draggable({
      containment: ".main-content",
      revert: "invalid",
      helper: "clone",
      zIndex: 1000,
    })
    .resizable({
      containment: cell.closest(".timetable"),
      handles: "se",
      minHeight: 56,
      minWidth: 96,
      resize: function (event, ui) {
        // Calculate how many cells to span
        const cellHeight = 60;
        const cellWidth = 100;
        const newRows = Math.ceil(ui.size.height / cellHeight);
        const newCols = Math.ceil(ui.size.width / cellWidth);

        // Update the course span data
        $(this).data("span-rows", newRows);
        $(this).data("span-cols", newCols);
      },
    });
}

function restorePlacedCourses() {
  placedCourses.forEach((placedCourse) => {
    const cell = $(
      `.time-slot[data-day="${placedCourse.day}"][data-time="${placedCourse.time}"], .day-slot[data-day="${placedCourse.day}"][data-time="${placedCourse.time}"]`
    );
    if (cell.length) {
      updateCell(cell, placedCourse);
    }
  });
}

function addCourse() {
  const courseName = $("#course-name").val().trim();
  if (!courseName) return;

  const courseId = Date.now();
  const course = {
    id: courseId,
    name: courseName,
    location: "",
  };

  courses.push(course);

  const courseHtml = `
        <div class="course-box" data-course-id="${courseId}">
          <div>${courseName}</div>
          <button class="remove-btn" onclick="removeCourse(${courseId})">&times;</button>
        </div>
      `;

  if ($("#courses-list p").length) {
    $("#courses-list").html("");
  }

  $("#courses-list").append(courseHtml);
  $("#course-name").val("");

  // Make course draggable
  $(`.course-box[data-course-id="${courseId}"]`).draggable({
    containment: ".main-content",
    revert: "invalid",
    helper: "clone",
    zIndex: 1000,
  });

  applyColors();
}

function addLocation() {
  const locationName = $("#location-name").val().trim();
  if (!locationName) return;

  const locationId = Date.now();
  locations.push({
    id: locationId,
    name: locationName,
  });

  const locationHtml = `
        <div class="location-item" data-location-id="${locationId}">
          ${locationName}
          <button class="remove-btn" onclick="removeLocation(${locationId})">&times;</button>
        </div>
      `;

  if ($("#locations-list p").length) {
    $("#locations-list").html("");
  }

  $("#locations-list").append(locationHtml);
  $("#location-name").val("");

  // Make location draggable to courses
  $(`.location-item[data-location-id="${locationId}"]`).draggable({
    containment: ".sidebar",
    revert: true,
    helper: "clone",
    zIndex: 1000,
  });

  // Make course boxes droppable for locations
  $(".course-box").droppable({
    accept: ".location-item",
    hoverClass: "drop-zone",
    drop: function (event, ui) {
      const courseId = $(this).data("course-id");
      const locationId = ui.draggable.data("location-id");
      const location = locations.find((l) => l.id === locationId);

      if (location) {
        const course = courses.find((c) => c.id === courseId);
        if (course) {
          course.location = location.name;

          // Update course box display with better text contrast
          const bgColor = getComputedStyle($(this)[0]).backgroundColor;
          const textColor = getContrastColor(bgColor);

          $(this).html(`
                <div style="color: ${textColor};">${course.name}</div>
                <div style="font-size: 11px; opacity: 0.9; color: ${textColor};">${location.name}</div>
                <button class="remove-btn" onclick="removeCourse(${courseId})">&times;</button>
              `);

          // Update any placed courses
          $(
            `.placed-course[data-course-id="${courseId}"] .course-location`
          ).text(location.name);

          // Re-setup draggable
          $(this).draggable({
            containment: ".main-content",
            revert: "invalid",
            helper: "clone",
            zIndex: 1000,
          });
        }
      }
    },
  });
}

function removeCourse(courseId) {
  courses = courses.filter((c) => c.id !== courseId);
  placedCourses = placedCourses.filter((c) => c.id !== courseId);
  $(`.course-box[data-course-id="${courseId}"]`).remove();
  $(`.placed-course[data-course-id="${courseId}"]`).parent().html("");

  if (courses.length === 0) {
    $("#courses-list").html("<p>Courses will appear here</p>");
  }
}

function removeLocation(locationId) {
  locations = locations.filter((l) => l.id !== locationId);
  $(`.location-item[data-location-id="${locationId}"]`).remove();

  if (locations.length === 0) {
    $("#locations-list").html("<p>Locations will appear here</p>");
  }
}

function removePlacedCourse(courseId) {
  placedCourses = placedCourses.filter((c) => c.id !== courseId);
  $(`.placed-course[data-course-id="${courseId}"]`).parent().html("");
}

function applyColors() {
  const bgColor = $("#bg-color").val();
  const courseColor = $("#course-color").val();
  const borderColor = $("#border-color").val();
  const headerColor = $("#header-color").val();

  // Calculate text colors based on background brightness
  const bgTextColor = getContrastColor(bgColor);
  const courseTextColor = getContrastColor(courseColor);
  const headerTextColor = getContrastColor(headerColor);

  $(".timetable-container").css("background-color", bgColor);
  $(".time-slot, .day-slot").css(
    "background-color",
    `rgba(${hexToRgb(bgColor).r}, ${hexToRgb(bgColor).g}, ${
      hexToRgb(bgColor).b
    }, 0.05)`
  );
  $(".timetable-cell").css("border-color", borderColor);
  $(".time-header, .day-header").css({
    "background-color": headerColor,
    color: headerTextColor,
  });
  $(".course-box, .placed-course").css({
    "background-color": `rgba(${hexToRgb(courseColor).r}, ${
      hexToRgb(courseColor).g
    }, ${hexToRgb(courseColor).b}, 0.4)`,
    color: courseTextColor,
  });
  $(
    ".course-box .course-name, .course-box div, .placed-course .course-name, .placed-course .course-location"
  ).css("color", courseTextColor);
}

function saveAsJPG() {
  const element = document.getElementById("timetable-container");
  const options = {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    allowTaint: true,
  };

  html2canvas(element, options)
    .then((canvas) => {
      const link = document.createElement("a");
      link.download = `timetable_${new Date().toISOString().split("T")[0]}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.9);
      link.click();
    })
    .catch((err) => {
      console.error("Error saving as JPG:", err);
      alert("Error saving timetable as JPG. Please try again.");
    });
}

function saveAsPDF() {
  const element = document.getElementById("timetable-container");
  const options = {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    allowTaint: true,
  };

  html2canvas(element, options)
    .then((canvas) => {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF("l", "mm", "a4"); // landscape orientation

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 297; // A4 width in mm (landscape)
      const pageHeight = 210; // A4 height in mm (landscape)
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`timetable_${new Date().toISOString().split("T")[0]}.pdf`);
    })
    .catch((err) => {
      console.error("Error saving as PDF:", err);
      alert("Error saving timetable as PDF. Please try again.");
    });
}

// Helper function to determine if a color is light or dark
function getContrastColor(hexColor) {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return "#000000";

  // Calculate relative luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

  return luminance > 0.5 ? "#000000" : "#ffffff";
}

// Helper function to convert hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

// Handle Enter key for inputs
$("#course-name").keypress(function (e) {
  if (e.which === 13) addCourse();
});

$("#location-name").keypress(function (e) {
  if (e.which === 13) addLocation();
});

// Handle window resize for responsive sidebar
$(window).resize(function () {
  if (window.innerWidth <= 768) {
    $(".sidebar").resizable("option", "handles", "s");
  } else {
    $(".sidebar").resizable("option", "handles", "e");
  }
});
