let data = [];
let checkedIn = [];

function parseAndSetData(json) {
  data = json.map((kid, idx) => ({ ...kid, uniqueKey: idx }));

  const saved = localStorage.getItem("checkedInKids");
  if (saved) {
    const savedKeys = new Set(JSON.parse(saved).map(String));
    checkedIn = data.filter(kid => savedKeys.has(String(kid.uniqueKey)));
  }
  renderCheckedInList();
}

const storedData = localStorage.getItem("uploadedLeadersData");
if (storedData) {
  try {
    const parsed = JSON.parse(storedData);
    parseAndSetData(parsed);
  } catch (err) {
    console.error("Failed to parse saved uploadedLeadersData:", err);
    localStorage.removeItem("uploadedLeadersData");
    loadDefaultData();
  }
} else {
  loadDefaultData();
}

function loadDefaultData() {
  fetch('leaders.json')
    .then(res => res.json())
    .then(json => {
      localStorage.setItem("uploadedLeadersData", JSON.stringify(json));
      parseAndSetData(json);
    })
    .catch(err => {
      document.getElementById('kidInfo').innerHTML = '<p>Error loading data.</p>';
      console.error(err);
    });
}

document.getElementById('jsonUpload').addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const json = JSON.parse(e.target.result);
      localStorage.setItem("uploadedLeadersData", JSON.stringify(json));
      localStorage.removeItem("checkedInKids");
      document.getElementById('kidInfo').innerHTML = '';
      document.getElementById('orderInput').value = '';
      parseAndSetData(json);
      alert("Successfully loaded and saved leaders.json.");
    } catch (err) {
      alert("Invalid JSON file.");
      console.error(err);
    }
  };
  reader.readAsText(file);
});

document.getElementById("orderInput").addEventListener("keydown", function(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    searchKid();
  }
});

function searchKid() {
  const orderId = document.getElementById('orderInput').value.trim();
  const info = document.getElementById('kidInfo');

  if (!orderId) {
    info.innerHTML = '<p>Please enter an Order ID.</p>';
    return;
  }

  const kids = data.filter(kid => String(kid["Order ID"]) === orderId);

  if (kids.length === 0) {
    info.innerHTML = `<p>No kids found for Order ID <strong>${orderId}</strong></p>`;
    return;
  }

  let html = '';
  kids.forEach(kid => {
    const alreadyCheckedIn = checkedIn.some(c => c.uniqueKey === kid.uniqueKey);
    html += `
      <div class="kid ${alreadyCheckedIn ? 'checked-in' : ''}">
        <p><strong>${kid["First Name"]} ${kid["Last Name"]}</strong> (Age ${kid["Age"]})</p>
        <p>Coach: ${kid["Coach"]}</p>
        <p>Parent: ${kid["Parent"]}</p>
        <p>Phone: ${kid["Primary Phone Number"]}</p>
        <p>Schedule: ${kid["Schedule Time"]}</p>
        ${
          alreadyCheckedIn
            ? '<p><em>Already checked in</em></p>'
            : `<button onclick="checkInKid(${kid.uniqueKey})">Check In</button>`
        }
      </div>
    `;
  });

  info.innerHTML = html;
}

function showKidDetails(uniqueKey) {
  const kid = data.find(k => k.uniqueKey === uniqueKey);
  if (!kid) return;

  const alreadyCheckedIn = checkedIn.some(c => c.uniqueKey === uniqueKey);
  const info = document.getElementById('kidInfo');

  info.innerHTML = `
    <div class="kid ${alreadyCheckedIn ? 'checked-in' : ''}">
      <p><strong>${kid["First Name"]} ${kid["Last Name"]}</strong> (Age ${kid["Age"]})</p>
      <p>Coach: ${kid["Coach"]}</p>
      <p>Parent: ${kid["Parent"]}</p>
      <p>Phone: ${kid["Primary Phone Number"]}</p>
      <p>Schedule: ${kid["Schedule Time"]}</p>
      ${
        alreadyCheckedIn
          ? '<p><em>Already checked in</em></p>'
          : `<button onclick="checkInKid(${kid.uniqueKey})">Check In</button>`
      }
    </div>
  `;

  info.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


function checkInKid(uniqueKey) {
  const kid = data.find(k => k.uniqueKey === uniqueKey);
  if (!kid) return;

  if (!checkedIn.some(c => c.uniqueKey === uniqueKey)) {
    checkedIn.push(kid);
    localStorage.setItem("checkedInKids", JSON.stringify(checkedIn.map(k => String(k.uniqueKey))));
  }

  renderCheckedInList();
  searchKid(); // refreshes kid list if multiple match
}

function renderCheckedInList() {
  const container = document.getElementById('checkedInList');
  const totalCount = document.getElementById('totalCount');

  if (data.length === 0) {
    container.innerHTML = '<p>No data loaded.</p>';
    totalCount.textContent = '';
    return;
  }

  // Checked-in kids grouped by coach
  if (checkedIn.length === 0) {
    container.innerHTML = '<p>No kids checked in yet.</p>';
  } else {
    const checkedInGrouped = {};
    checkedIn.forEach(kid => {
      if (!checkedInGrouped[kid.Coach]) checkedInGrouped[kid.Coach] = [];
      checkedInGrouped[kid.Coach].push(kid);
    });

    let html = '';
    for (const coach in checkedInGrouped) {
      const kids = checkedInGrouped[coach];
      const totalForCoach = data.filter(k => k.Coach === coach).length;
      html += `
        <div class="coach-section">
          <h3>Coach ${coach} – ${kids.length} / ${totalForCoach} checked in</h3>
          <ul>
            ${kids.map(kid => `
              <li>
                <a href="#" onclick="showKidDetails(${kid.uniqueKey})">
                  ${kid["First Name"]} ${kid["Last Name"]} (Age ${kid["Age"]})
                </a>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }
    container.innerHTML = html;
  }

  // Not checked-in kids grouped by coach in a collapsible <details>
  const notCheckedIn = data.filter(kid => !checkedIn.some(c => c.uniqueKey === kid.uniqueKey));
  let notCheckedHtml = '';
  if (notCheckedIn.length === 0) {
    notCheckedHtml = '<p>All kids are checked in.</p>';
  } else {
    const notCheckedGrouped = {};
    notCheckedIn.forEach(kid => {
      if (!notCheckedGrouped[kid.Coach]) notCheckedGrouped[kid.Coach] = [];
      notCheckedGrouped[kid.Coach].push(kid);
    });

    notCheckedHtml += `
      <details>
        <summary style="cursor:pointer; font-weight:bold; margin-top:1rem;">
          Not Checked-In Kids
        </summary>
    `;
    for (const coach in notCheckedGrouped) {
      const kids = notCheckedGrouped[coach];
      notCheckedHtml += `
        <div class="coach-section" style="margin-top: 0.5rem;">
          <h3>Coach ${coach} – ${kids.length} kids not checked in</h3>
          <ul>
            ${kids.map(kid => `
              <li>
                <a href="#" onclick="showKidDetails(${kid.uniqueKey})">
                  ${kid["First Name"]} ${kid["Last Name"]} (Age ${kid["Age"]})
                </a>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }
    notCheckedHtml += '</details>';
  }

  container.innerHTML += notCheckedHtml;
  totalCount.textContent = `${checkedIn.length} / ${data.length} kids checked in`;
}

function resetCheckIns() {
  const confirmed = confirm("Are you sure you want to reset all check-ins?");
  if (!confirmed) return;

  checkedIn = [];
  localStorage.removeItem("checkedInKids");
  document.getElementById('kidInfo').innerHTML = '';
  document.getElementById('orderInput').value = '';
  renderCheckedInList();
}

function clearSearch() {
  const input = document.getElementById('orderInput');
  input.value = '';
  document.getElementById('kidInfo').innerHTML = '';
  input.focus();
}
