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

function getAreas(data, universe) {
  const keys = Object.keys(data.universe[universe]?.area ?? {});
  const sorted = keys.sort((a, b) => a.localeCompare(b));
  return sorted;
}

function getQualities(data, universe, area) {
  const options = data.quality;

  if (Array.isArray(options)) {
    return options;
  }

  return options ? [options] : ["unknown"];
}

function get(obj, path) {
  return path
    .split(".")
    .reduce((value, key) => {
      value = value?.[key];

      if (Array.isArray(value)) {
        value = pick(value);
      }

      return value;
    }, obj);
}

function render(template, data) {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, path) => {
    const value = get(data, path);

    if (value == null) {
      return "";
    }

    const out = render(String(value), data);
    return out;
  });
}

function Name(data, universe) {
  const pattern = pick(data.universe[universe]?.name?.pattern ?? []) ?? "";
  const name = render(pattern, data);
  console.log(name);
  return name;
}

function generateTavern(data, universe, selectedArea = "random", selectedQuality = "random") {
  const options = getAreas(data, universe);

  const area = selectedArea === "random" || !options.includes(selectedArea)
    ? pick(options)
    : selectedArea;

  const quality = selectedQuality === "random" || !data.quality.includes(selectedQuality)
    ? pick(data.quality)
    : selectedQuality;

  // patrons - townsfolk / adventurers

  return {
    universe,
    area,
    quality,
    name: Name(data, universe, area, quality),

    // location: a road...
    // description
    // innkeeper
    // menu
    // patrons
    // rumors
  };
}

function formatTavern(tavern) {
  if (!tavern) {
    return `Could not generate a tavern for the selected universe.`;
  }

  return [
    `Area: ${tavern.area}`,
    `Quality: ${tavern.quality}`,
    `Name: ${tavern.name}`,
    // `Trait: ${tavern.trait}`,
    // `Goal: ${tavern.goal}`,
    // `Quirk: ${tavern.quirk}`,
    // `Public Attitude: ${npc.publicAttitude}`,
    // `True Attitude: ${npc.trueAttitude}`,
  ].join("\n");
}

function renderUniverseOptions(data) {
  const universeSelect = document.getElementById("universe-select");
  universeSelect.innerHTML = getUniverses(data)
    .map(universe => `<option value="${universe}">${universe}</option>`)
    .join("");
}

function renderAreaOptions(data, universe) {
  const areaSelect = document.getElementById("area-select");
  const options = ["random", ...getAreas(data, universe)];
  areaSelect.innerHTML = options
    .map(value => `<option value="${value}">${value === "random" ? "Random" : value}</option>`)
    .join("");
}

function renderQualityOptions(data, universe, area) {
  const select = document.getElementById("quality-select");
  const qualities = getQualities(data, universe, area);
  const options = ["random", ...qualities];
  select.innerHTML = options
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

  const areas = getAreas(data, universe);
  const areaParam = params.get("area");
  const area = areaParam && areas.includes(areaParam)
    ? areaParam
    : "random";

  const qualities = getQualities(data, universe, area);
  const qualityParam = params.get("quality");
  const quality = qualityParam && (qualityParam === "random" || qualities.includes(qualityParam))
    ? qualityParam
    : "random";

  return { universe, area, quality }
}

function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText && document.hasFocus()) {
    return navigator.clipboard.writeText(text);
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.width = "1px";
  textarea.style.height = "1px";
  textarea.style.padding = "0";
  textarea.style.border = "none";
  textarea.style.outline = "none";
  textarea.style.boxShadow = "none";
  textarea.style.background = "transparent";
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
  document.getElementById("output").textContent = message;
}

function generateFromForm(data) {
  const universe = document.getElementById("universe-select").value;
  const area = document.getElementById("area-select").value;
  const quality = document.getElementById("quality-select").value;
  const areas = getAreas(data, universe);

  if (!areas.length) {
    createOutput(`No areas are available for ${universe}. Please choose another universe.`);
    return;
  }

  createOutput(formatTavern(generateTavern(data, universe, area, quality)));
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
  renderAreaOptions(data, queryDefaults.universe);
  document.getElementById("area-select").value = queryDefaults.area;
  renderQualityOptions(data, queryDefaults.universe, queryDefaults.area);
  document.getElementById("quality-select").value = queryDefaults.quality;
  // document.getElementById("count-input").value = queryDefaults.count;
  clearOutput();

  document.getElementById("universe-select").addEventListener("change", event => {
    renderAreaOptions(data, event.target.value);
  });

  document.getElementById("area-select").addEventListener("change", event => {
    const currentUniverse = document.getElementById("universe-select").value;
    const currentQuality = document.getElementById("quality-select").value;
    const validQualities = getQualities(data, currentUniverse, event.target.value);
    const isQualityValid = currentQuality === "random" || validQualities.includes(currentQuality);

    renderQualityOptions(data, currentUniverse, event.target.value);

    if (isQualityValid) {
      document.getElementById("quality-select").value = currentQuality;
    }
  });

  document.getElementById("generate-button").addEventListener("click", () => generateFromForm(data));
  document.getElementById("clear-button").addEventListener("click", () => clearOutput());
  document.getElementById("copy-button").addEventListener("click", async event => {
    const outputText = document.getElementById("output").textContent || "";

    try {
      await copyTextToClipboard(outputText);
      const button = event.currentTarget;
      const previousLabel = button.textContent;
      button.textContent = "Copied!";
      setTimeout(() => {
        button.textContent = previousLabel;
      }, 1200);
    } catch (error) {
      const button = event.currentTarget;
      const previousLabel = button.textContent;
      button.textContent = "Failed!";
      setTimeout(() => {
        button.textContent = previousLabel;
      }, 1200);
    }
  });
}

window.addEventListener("DOMContentLoaded", init);
