type BoomBoxView = "mode" | "single" | "lobby" | "create";

type BoomBoxRoom = {
  id: string;
  name: string;
  creator: string;
  seats: number;
  connected: number;
  terrain: string;
  pace: string;
  aiFill: boolean;
  started: boolean;
};

const playerNameKey = "badant-games-player-name";

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing Boom Box element: ${selector}`);
  }
  return element;
}

export function initBoomBox() {
  const overlay = required<HTMLElement>("#overlay");
  const gameCanvas = required<HTMLCanvasElement>("#game");
  const homeButton = required<HTMLButtonElement>("#home");
  const modePanel = required<HTMLElement>("#boombox-mode-panel");
  const singlePanel = required<HTMLElement>("#boombox-single-panel");
  const lobbyPanel = required<HTMLElement>("#boombox-lobby-panel");
  const createPanel = required<HTMLElement>("#boombox-create-panel");
  const modeSingleButton = required<HTMLButtonElement>("#boombox-mode-single");
  const modeMultiButton = required<HTMLButtonElement>("#boombox-mode-multi");
  const modeBackButton = required<HTMLButtonElement>("#boombox-mode-back");
  const singleBackButton = required<HTMLButtonElement>("#boombox-single-back");
  const createButton = required<HTMLButtonElement>("#boombox-create");
  const refreshButton = required<HTMLButtonElement>("#boombox-refresh");
  const lobbyBackButton = required<HTMLButtonElement>("#boombox-lobby-back");
  const createdList = required<HTMLElement>("#boombox-created-list");
  const availableList = required<HTMLElement>("#boombox-available-list");
  const createdCount = required<HTMLElement>("#boombox-created-count");
  const availableCount = required<HTMLElement>("#boombox-available-count");
  const lobbyStatus = required<HTMLElement>("#boombox-lobby-status");
  const createForm = required<HTMLFormElement>("#boombox-create-form");
  const createBackButton = required<HTMLButtonElement>("#boombox-create-back");
  const createNextButton = required<HTMLButtonElement>("#boombox-create-next");
  const createSubmitButton = required<HTMLButtonElement>("#boombox-create-submit");
  const roomNameInput = required<HTMLInputElement>("#boombox-room-name");
  const commanderInput = required<HTMLInputElement>("#boombox-commander");
  const terrainInput = required<HTMLSelectElement>("#boombox-terrain");
  const seatsInput = required<HTMLSelectElement>("#boombox-seats");
  const paceInput = required<HTMLSelectElement>("#boombox-turn-pace");
  const aiFillInput = required<HTMLInputElement>("#boombox-ai-fill");
  const createSummary = required<HTMLElement>("#boombox-create-summary");
  const steps = Array.from(createPanel.querySelectorAll<HTMLElement>("[data-boombox-step]"));
  const indicators = Array.from(createPanel.querySelectorAll<HTMLElement>("[data-boombox-step-indicator]"));

  let createStep = 1;
  let joinedRoomId = "";
  let roomSequence = 1027;
  let createdRooms: BoomBoxRoom[] = [];
  let availableRooms: BoomBoxRoom[] = [
    { id: "BB-1024", name: "Sunset Showdown", creator: "Mara", seats: 4, connected: 2, terrain: "Sunset Range", pace: "Standard", aiFill: true, started: false },
    { id: "BB-1025", name: "Ice Shelf Siege", creator: "Rook", seats: 3, connected: 1, terrain: "Ice Shelf", pace: "Relaxed", aiFill: false, started: false },
    { id: "BB-1026", name: "Lunar Test Range", creator: "Nova", seats: 6, connected: 5, terrain: "Lunar Crater", pace: "Blitz", aiFill: true, started: false },
  ];

  function setPanel(next: BoomBoxView) {
    overlay.hidden = false;
    overlay.classList.remove("is-platform");
    overlay.classList.add("is-boombox");
    gameCanvas.hidden = true;
    homeButton.hidden = false;
    modePanel.hidden = next !== "mode";
    singlePanel.hidden = next !== "single";
    lobbyPanel.hidden = next !== "lobby";
    createPanel.hidden = next !== "create";
    if (next === "lobby") {
      renderRooms();
    }
  }

  function close() {
    overlay.classList.remove("is-boombox");
    overlay.hidden = true;
    modePanel.hidden = true;
    singlePanel.hidden = true;
    lobbyPanel.hidden = true;
    createPanel.hidden = true;
    gameCanvas.hidden = false;
  }

  function roomStatus(room: BoomBoxRoom) {
    const waiting = Math.max(0, room.seats - room.connected);
    if (room.started) return "Match in progress";
    if (waiting === 0) return "Ready to launch";
    return `Waiting for ${waiting} commander${waiting === 1 ? "" : "s"}`;
  }

  function createRoomCard(room: BoomBoxRoom, mine: boolean) {
    const card = document.createElement("article");
    card.className = `boombox-room-card${room.id === joinedRoomId ? " is-joined" : ""}`;
    const heading = document.createElement("div");
    heading.className = "boombox-room-heading";
    const title = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = room.name;
    const id = document.createElement("span");
    id.textContent = room.id;
    title.append(name, id);
    const badge = document.createElement("span");
    badge.className = `boombox-room-badge ${room.connected === room.seats ? "is-ready" : ""}`;
    badge.textContent = roomStatus(room);
    heading.append(title, badge);
    const details = document.createElement("div");
    details.className = "boombox-room-details";
    const creator = document.createElement("span");
    creator.textContent = `Created by ${room.creator}`;
    const seats = document.createElement("span");
    seats.textContent = `${room.connected}/${room.seats} connected`;
    const terrain = document.createElement("span");
    terrain.textContent = `${room.terrain} - ${room.pace}`;
    details.append(creator, seats, terrain);
    const actions = document.createElement("div");
    actions.className = "boombox-room-actions";
    const action = document.createElement("button");
    action.type = "button";
    if (mine) {
      action.className = "secondary";
      action.textContent = "Cancel room";
      action.addEventListener("click", () => {
        createdRooms = createdRooms.filter((candidate) => candidate.id !== room.id);
        if (joinedRoomId === room.id) joinedRoomId = "";
        lobbyStatus.textContent = `${room.name} was cancelled.`;
        renderRooms();
      });
    } else if (room.id === joinedRoomId) {
      action.className = "secondary";
      action.textContent = "Joined";
      action.disabled = true;
    } else {
      action.textContent = room.connected === room.seats ? "Full" : "Join room";
      action.disabled = room.started || room.connected >= room.seats;
      action.addEventListener("click", () => {
        joinedRoomId = room.id;
        room.connected = Math.min(room.seats, room.connected + 1);
        lobbyStatus.textContent = `Joined ${room.name}. Waiting for the room to launch.`;
        renderRooms();
      });
    }
    actions.append(action);
    card.append(heading, details, actions);
    return card;
  }

  function renderRooms() {
    createdList.replaceChildren(...createdRooms.map((room) => createRoomCard(room, true)));
    availableList.replaceChildren(...availableRooms.filter((room) => !room.started).map((room) => createRoomCard(room, false)));
    createdCount.textContent = `${createdRooms.length} room${createdRooms.length === 1 ? "" : "s"}`;
    availableCount.textContent = `${availableRooms.length} room${availableRooms.length === 1 ? "" : "s"}`;
    if (createdRooms.length === 0) {
      const empty = document.createElement("p");
      empty.className = "boombox-empty-state";
      empty.textContent = "You have not created a room yet.";
      createdList.append(empty);
    }
    if (availableRooms.length === 0) {
      const empty = document.createElement("p");
      empty.className = "boombox-empty-state";
      empty.textContent = "No open rooms right now. Create one and invite your commanders.";
      availableList.append(empty);
    }
  }

  function updateCreateSummary() {
    const rows = [
      ["Room", roomNameInput.value.trim() || "Unnamed room"],
      ["Commander", commanderInput.value.trim() || "Commander"],
      ["Terrain", terrainInput.selectedOptions[0]?.textContent || "Sunset Range"],
      ["Seats", seatsInput.selectedOptions[0]?.textContent || "4 commanders"],
      ["Turn pace", paceInput.selectedOptions[0]?.textContent || "Standard"],
      ["AI fill", aiFillInput.checked ? "Allowed" : "Off"],
    ];
    createSummary.replaceChildren(...rows.flatMap(([label, value]) => {
      const term = document.createElement("dt");
      term.textContent = label;
      const description = document.createElement("dd");
      description.textContent = value;
      return [term, description];
    }));
  }

  function setCreateStep(next: number) {
    createStep = Math.max(1, Math.min(3, next));
    steps.forEach((step) => { step.hidden = Number(step.dataset.boomboxStep) !== createStep; });
    indicators.forEach((indicator) => {
      const number = Number(indicator.dataset.boomboxStepIndicator);
      indicator.classList.toggle("is-active", number === createStep);
      indicator.classList.toggle("is-complete", number < createStep);
    });
    createBackButton.textContent = createStep === 1 ? "Back to lobby" : "Back";
    createNextButton.hidden = createStep === 3;
    createSubmitButton.hidden = createStep !== 3;
    if (createStep === 3) updateCreateSummary();
  }

  function openCreate() {
    const savedName = localStorage.getItem(playerNameKey)?.trim();
    if (savedName && commanderInput.value === "Commander") commanderInput.value = savedName;
    setCreateStep(1);
    setPanel("create");
  }

  function createRoom() {
    const room: BoomBoxRoom = {
      id: `BB-${roomSequence++}`,
      name: roomNameInput.value.trim() || "Unnamed room",
      creator: commanderInput.value.trim() || "Commander",
      seats: Number(seatsInput.value),
      connected: 1,
      terrain: terrainInput.selectedOptions[0]?.textContent || "Sunset Range",
      pace: paceInput.selectedOptions[0]?.textContent?.split(" - ")[0] || "Standard",
      aiFill: aiFillInput.checked,
      started: false,
    };
    createdRooms = [room, ...createdRooms];
    joinedRoomId = room.id;
    lobbyStatus.textContent = `${room.name} created. Share the room code when the match is ready.`;
    setPanel("lobby");
  }

  modeSingleButton.addEventListener("click", () => setPanel("single"));
  modeMultiButton.addEventListener("click", () => setPanel("lobby"));
  modeBackButton.addEventListener("click", () => { close(); window.dispatchEvent(new CustomEvent("boombox-back-games")); });
  singleBackButton.addEventListener("click", () => setPanel("mode"));
  createButton.addEventListener("click", openCreate);
  refreshButton.addEventListener("click", () => {
    const now = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    lobbyStatus.textContent = `Rooms refreshed at ${now}.`;
    availableRooms = [...availableRooms];
    renderRooms();
  });
  lobbyBackButton.addEventListener("click", () => setPanel("mode"));
  createBackButton.addEventListener("click", () => {
    if (createStep === 1) setPanel("lobby");
    else setCreateStep(createStep - 1);
  });
  createNextButton.addEventListener("click", () => setCreateStep(createStep + 1));
  createForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (createStep === 3) createRoom();
  });
  [roomNameInput, commanderInput, terrainInput, seatsInput, paceInput, aiFillInput].forEach((input) => input.addEventListener("input", updateCreateSummary));

  return {
    open: () => setPanel("mode"),
    close,
  };
}
