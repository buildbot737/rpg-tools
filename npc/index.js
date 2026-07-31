async function loadData() {
  try {
    const response = await fetch("./data.json");

    if (!response.ok) {
      throw new Error(`Failed to load data.json: ${response.status} ${response.statusText}`);
    }

    const loaded = await response.json();
    return loaded;
  } catch (error) {
    createOutput(`Error loading data: ${error.message}`);
    console.error(error);
    return null;
  }
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getUniverses(data) {
  const keys = Object.keys(data.universe ?? {});
  const sorted = keys.sort((a, b) => a.localeCompare(b));
  return sorted;
}

function getLineages(data, universe) {
  const keys = Object.keys(data.universe[universe]?.lineage ?? {});
  const sorted = keys.sort((a, b) => a.localeCompare(b));
  return sorted;
}

function getGenders(data, universe, lineage) {
  const options = data.universe[universe]?.lineage?.[lineage]?.gender
    ?? data.universe[universe]?.gender
    ?? data.gender;

  if (Array.isArray(options)) {
    return options;
  }

  return options ? [options] : ["unknown"];
}

function FirstName(data, universe, lineage, gender) {
  const list = data.universe[universe]?.lineage?.[lineage]?.first_name?.[gender] ?? [];
  return list.length ? pick(list) : "Unknown";
}

function LastName(data, universe, lineage) {
  const list = data.universe[universe]?.lineage?.[lineage]?.last_name ?? [];
  return list.length ? pick(list) : "Unknown";
}

function Lineage(data, universe) {
  const options = getLineages(data, universe);
  return options.length ? pick(options) : "unknown";
}

function Age(data, universe, lineage) {
  const min = data.universe[universe]?.lineage?.[lineage]?.age?.min
    ?? data.universe[universe]?.age?.min
    ?? data.age?.min;

  const max = data.universe[universe]?.lineage?.[lineage]?.age?.max
    ?? data.universe[universe]?.age?.max
    ?? data.age?.max;

  if (!min || !max) {
    return "Unknown";
  }

  return rand(min, max);
}

function generateNPC(data, universe, selectedLineage = "random", selectedGender = "random") {
  const options = getLineages(data, universe);

  if (!options.length) {
    return null;
  }

  const lineage = selectedLineage === "random" || !options.includes(selectedLineage)
    ? Lineage(data, universe)
    : selectedLineage;

  const gender = selectedGender === "random" || !data.gender.includes(selectedGender)
    ? pick(data.gender)
    : selectedGender;

  return {
    universe,
    lineage,
    gender,
    firstname: FirstName(data, universe, lineage, gender),
    lastname: LastName(data, universe, lineage),
    age: Age(data, universe, lineage),
    trait: pick(data.npc.trait),
    goal: pick(data.npc.goal),
    quirk: pick(data.npc.quirk),
    publicAttitude: pick(data.npc.attitude),
    trueAttitude: pick(data.npc.attitude),
  };
}

function formatNPC(npc, index) {
  if (!npc) {
    return `NPC ${index + 1}: Could not generate an NPC for the selected universe.`;
  }

  return [
    `<b>Lineage</b>: ${npc.lineage}`,
    `<b>Gender</b>: ${npc.gender}`,
    `<b>Name</b>: ${npc.firstname} ${npc.lastname} (${npc.age})`,
    `<b>Trait</b>: ${npc.trait}`,
    `<b>Goal</b>: ${npc.goal}`,
    `<b>Quirk</b>: ${npc.quirk}`,
    `<b>Public Attitude</b>: ${npc.publicAttitude}`,
    `<b>True Attitude</b>: ${npc.trueAttitude}`,
  ].join("\n");
}

function renderUniverseOptions(data) {
  const universeSelect = document.getElementById("universe-select");
  universeSelect.innerHTML = getUniverses(data)
    .map(universe => `<option value="${universe}">${universe}</option>`)
    .join("");
}

function renderLineageOptions(data, universe) {
  const lineageSelect = document.getElementById("lineage-select");
  const options = ["random", ...getLineages(data, universe)];
  lineageSelect.innerHTML = options
    .map(value => `<option value="${value}">${value === "random" ? "Random" : value}</option>`)
    .join("");
}

function renderGenderOptions(data, universe, lineage) {
  const genderSelect = document.getElementById("gender-select");
  const genders = getGenders(data, universe, lineage);
  const options = ["random", ...genders];
  genderSelect.innerHTML = options
    .map(value => `<option value="${value}">${value === "random" ? "Random" : value}</option>`)
    .join("");
}

function getQueryDefaults(data) {
  const params = new URLSearchParams(window.location.search);
  const universes = getUniverses(data);
  const universeParam = params.get("universe");
  const universe = universeParam && universes.includes(universeParam)
    ? universeParam
    : (universes.includes("hexxen") ? "hexxen" : universes[0] ?? "");

  const lineages = getLineages(data, universe);
  const lineageParam = params.get("lineage");
  const lineage = lineageParam && lineages.includes(lineageParam)
    ? lineageParam
    : "random";

  const genders = getGenders(data, universe, lineage);
  const genderParam = params.get("gender");
  const gender = genderParam && (genderParam === "random" || genders.includes(genderParam))
    ? genderParam
    : "random";

  const parsed = Number.parseInt(params.get("num") ?? "", 10);
  const count = Math.min(10, Math.max(1, isNaN(parsed) ? 2 : parsed));
  return { universe, lineage, gender, count };
}

function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.className = "clipboard-textarea";
  document.body.appendChild(textarea);
  textarea.select();

  const successful = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!successful) {
    return Promise.reject(new Error("Copy command failed"));
  }

  return Promise.resolve();
}

function createOutput(message) {
  const container = document.getElementById("output");
  container.innerHTML = message;
}

function addNPCOutput(npcText) {
  const outputContainer = document.getElementById("output");

  const element = document.createElement("div");
  element.className = "npc-output-box";

  const textContent = document.createElement("div");
  textContent.className = "npc-output-text";
  textContent.innerHTML = npcText;

  const copyButton = document.createElement("button");
  copyButton.className = "npc-copy-btn";
  copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 1em; height: 1em; vertical-align: -0.125em;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
  copyButton.title = "Copy to clipboard";
  copyButton.addEventListener("click", async event => {
    try {
      await copyTextToClipboard(npcText);
      const button = event.currentTarget;
      button.classList.add("success");
      setTimeout(() => {
        button.classList.remove("success");
      }, 1200);
    } catch (error) {
      const button = event.currentTarget;
      button.classList.add("error");
      setTimeout(() => {
        button.classList.remove("error");
      }, 1200);
    }
  });

  element.appendChild(textContent);
  element.appendChild(copyButton);
  outputContainer.appendChild(element);
}

function generateFromForm(data) {
  const universe = document.getElementById("universe-select").value;
  const lineage = document.getElementById("lineage-select").value;
  const gender = document.getElementById("gender-select").value;
  const count = Math.min(10, Math.max(1, Number(document.getElementById("count-input").value) || 1));
  const lineages = getLineages(data, universe);

  if (!lineages.length) {
    createOutput(`No lineages are available for ${universe}. Please choose another universe.`);
    return;
  }

  const outputContainer = document.getElementById("output");
  outputContainer.innerHTML = "";

  Array.from({ length: count }, (_, index) => formatNPC(generateNPC(data, universe, lineage, gender), index))
    .forEach(npcText => addNPCOutput(npcText));
}

function clearOutput() {
  createOutput("Choose options and press Generate.");
}

async function init() {
  const data = await loadData();

  if (!data) {
    return;
  }

  const queryDefaults = getQueryDefaults(data);
  renderUniverseOptions(data);
  document.getElementById("universe-select").value = queryDefaults.universe;
  renderLineageOptions(data, queryDefaults.universe);
  document.getElementById("lineage-select").value = queryDefaults.lineage;
  renderGenderOptions(data, queryDefaults.universe, queryDefaults.lineage);
  document.getElementById("gender-select").value = queryDefaults.gender;
  document.getElementById("count-input").value = queryDefaults.count;
  clearOutput();

  document.getElementById("universe-select").addEventListener("change", event => {
    renderLineageOptions(data, event.target.value);
  });

  document.getElementById("lineage-select").addEventListener("change", event => {
    const currentUniverse = document.getElementById("universe-select").value;
    const currentGender = document.getElementById("gender-select").value;
    const validGenders = getGenders(data, currentUniverse, event.target.value);
    const isGenderValid = currentGender === "random" || validGenders.includes(currentGender);

    renderGenderOptions(data, currentUniverse, event.target.value);

    if (isGenderValid) {
      document.getElementById("gender-select").value = currentGender;
    }
  });

  document.getElementById("generate-button").addEventListener("click", () => generateFromForm(data));
  document.getElementById("clear-button").addEventListener("click", () => clearOutput());
}

window.addEventListener("DOMContentLoaded", init);
