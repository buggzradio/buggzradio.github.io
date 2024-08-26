// Initialize the map
const map = L.map('map').setView([39.8283, -98.5795], 4); // Centered on the USA

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let contacts = [];
let stationConfig = {
    location: [39.8283, -98.5795],
    timeZone: 'CST',
    defaultFrequency: '',
    defaultMode: ''
};

document.getElementById('config-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const stationLocation = document.getElementById('stationLocation').value.split(',');
    stationConfig.location = [parseFloat(stationLocation[0]), parseFloat(stationLocation[1])];
    stationConfig.timeZone = document.getElementById('timeZone').value;
    stationConfig.defaultFrequency = document.getElementById('defaultFrequency').value;
    stationConfig.defaultMode = document.getElementById('defaultMode').value;

    // Update the default frequency and mode in the contact form
    document.getElementById('frequency').value = stationConfig.defaultFrequency;
    document.getElementById('mode').value = stationConfig.defaultMode;

    alert('Configuration saved!');
    toggleConfigPage();
});

document.getElementById('callsign').addEventListener('input', async function() {
    const callsign = document.getElementById('callsign').value;
    if (callsign) {
        // Fetch operator details from the API
        const response = await fetch(`https://callook.info/${callsign}/json`);
        const data = await response.json();

        if (data.status === "VALID") {
            document.getElementById('operatorName').value = data.name;
            document.getElementById('location').value = `${data.location.city}, ${data.location.state}`;
            document.getElementById('frequency').value = data.operator.frequency || stationConfig.defaultFrequency;
            document.getElementById('mode').value = data.operator.mode || stationConfig.defaultMode;
        } else {
            document.getElementById('operatorName').value = 'Unknown';
            document.getElementById('location').value = 'Unknown';
            document.getElementById('frequency').value = stationConfig.defaultFrequency;
            document.getElementById('mode').value = stationConfig.defaultMode;
        }

        autofillDateTimeAndLocation();
    }
});

document.getElementById('contact-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const callsign = document.getElementById('callsign').value;
    const frequency = document.getElementById('frequency').value;
    const mode = document.getElementById('mode').value;
    const timeCST = document.getElementById('timeCST').value;
    const timeUTC = document.getElementById('timeUTC').value;

    // Fetch operator details from the API
    const response = await fetch(`https://callook.info/${callsign}/json`);
    const data = await response.json();

    let operatorName = '';
    let location = '';
    let lat = 0;
    let lon = 0;

    if (data.status === "VALID") {
        operatorName = data.name;
        location = `${data.location.city}, ${data.location.state}`;
        lat = data.location.latitude;
        lon = data.location.longitude;
    } else {
        operatorName = 'Unknown';
        location = 'Unknown';
    }

    // Add the contact to the list
    const contact = { callsign, frequency, mode, timeCST, timeUTC, operatorName, location, lat, lon };
    contacts.push(contact);
    addContactToTable(contact);

    // Plot the contact on the map
    if (lat && lon) {
        const marker = L.marker([lat, lon]).addTo(map);
        marker.bindPopup(`<b>${callsign}</b><br>${location}`).openPopup();
        L.polyline([[lat, lon], stationConfig.location], { color: 'red' }).addTo(map);
    }

    // Clear the form but keep frequency and mode
    document.getElementById('callsign').value = '';
    document.getElementById('timeCST').value = '';
    document.getElementById('timeUTC').value = '';
});

function autofillDateTimeAndLocation() {
    const now = new Date();
    
    const timeCST = now.toISOString().slice(0, 19); // ISO string in UTC
    const timeUTC = new Date(now.getTime() + now.getTimezoneOffset() * 60000).toISOString().slice(0, 19);

    document.getElementById('timeCST').value = timeCST;
    document.getElementById('timeUTC').value = timeUTC;
    document.getElementById('location').value = `${stationConfig.location[0]}, ${stationConfig.location[1]}`;
}

function addContactToTable(contact) {
    const tbody = document.getElementById('contacts-body');
    const row = document.createElement('tr');

    row.innerHTML = `
        <td>${contact.callsign}</td>
        <td>${contact.frequency}</td>
        <td>${contact.mode}</td>
        <td>${contact.timeCST}</td>
        <td>${contact.timeUTC}</td>
        <td>${contact.operatorName}</td>
        <td>${contact.location}</td>
    `;

    tbody.appendChild(row);
}

function exportToADIF() {
    let adifData = '';

    contacts.forEach(contact => {
        adifData += `CALL:${contact.callsign.length} ${contact.callsign}\n`;
        adifData += `FREQ:${contact.frequency}\n`;
        adifData += `MODE:${contact.mode}\n`;
        adifData += `TIME:${contact.timeCST}\n`;
        adifData += `TIMEUTC:${contact.timeUTC}\n`;
        adifData += `NAME:${contact.operatorName}\n`;
        adifData += `LOC:${contact.location}\n`;
        adifData += '\n';
    });

    const blob = new Blob([adifData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'contacts.adi';
    link.click();
    URL.revokeObjectURL(url);
}

function toggleConfigPage() {
    const configPage = document.getElementById('config-page');
    configPage.style.display = configPage.style.display === 'none' ? 'block' : 'none';
}

// Initialize the default values when the page loads
document.addEventListener('DOMContentLoaded', function() {
    autofillDateTimeAndLocation();
    document.getElementById('frequency').value = stationConfig.defaultFrequency;
    document.getElementById('mode').value = stationConfig.defaultMode;
});
