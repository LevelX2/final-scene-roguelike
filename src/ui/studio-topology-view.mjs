import {
  formatStudioLabel,
  formatStudioWithArchetype,
  getArchetypeForFloor,
  getStudioArchetypeLabel,
} from '../studio-theme.mjs';
import { getStudioTransitionLabel } from '../studio-topology.mjs';

export const STUDIO_TOPOLOGY_SPACING = 176;
const DEFAULT_ZOOM_PERCENT = 118;

function getStudioNodeDimensions(spacing = STUDIO_TOPOLOGY_SPACING) {
  return {
    width: Math.max(48, Math.round(spacing * 0.8)),
    height: Math.max(28, Math.round(spacing * 0.38)),
    depth: Math.max(42, Math.round(spacing * 0.54)),
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function keyOf(x, y) {
  return `${x},${y}`;
}

function positionsMatch(left, right) {
  return Boolean(
    left &&
    right &&
    Number(left.x) === Number(right.x) &&
    Number(left.y) === Number(right.y),
  );
}

export function toStudioScenePosition(position, spacing = STUDIO_TOPOLOGY_SPACING) {
  const x = (Number(position?.x) || 0) * spacing;
  const y = (Number(position?.z) || 0) * -spacing;
  const z = (Number(position?.y) || 0) * spacing;
  return { x, y, z };
}

export function describeStudioRelativePosition(position) {
  const horizontal = Number(position?.x) || 0;
  const depth = Number(position?.y) || 0;
  const vertical = Number(position?.z) || 0;
  const parts = [];

  if (horizontal !== 0) {
    parts.push(`${Math.abs(horizontal)} ${horizontal > 0 ? 'rechts' : 'links'} vom Start`);
  }
  if (depth !== 0) {
    parts.push(`${Math.abs(depth)} ${depth > 0 ? 'hinter' : 'vor'} dem Start`);
  }
  if (vertical !== 0) {
    parts.push(`${Math.abs(vertical)} ${vertical > 0 ? 'ueber' : 'unter'} dem Start`);
  }

  return parts.length > 0 ? parts.join(' | ') : 'am Startpunkt des Komplexes';
}

function buildSegment(sceneFrom, sceneTo, fromFloor, toFloor, visitedFloorSet, currentFloor, fromSize, toSize) {
  const deltaX = sceneTo.x - sceneFrom.x;
  const deltaY = sceneTo.y - sceneFrom.y;
  const axis = deltaX !== 0 ? 'x' : deltaY !== 0 ? 'y' : 'z';
  const axisDistance = Math.max(
    0,
    axis === 'x'
      ? Math.abs(sceneTo.x - sceneFrom.x)
      : axis === 'y'
        ? Math.abs(sceneTo.y - sceneFrom.y)
        : Math.abs(sceneTo.z - sceneFrom.z),
  );
  const fromHalfExtent = axis === 'x'
    ? (fromSize?.width ?? 0) / 2
    : axis === 'y'
      ? (fromSize?.height ?? 0) / 2
      : (fromSize?.depth ?? 0) / 2;
  const toHalfExtent = axis === 'x'
    ? (toSize?.width ?? 0) / 2
    : axis === 'y'
      ? (toSize?.height ?? 0) / 2
      : (toSize?.depth ?? 0) / 2;
  const length = Math.max(12, axisDistance - fromHalfExtent - toHalfExtent);
  const midX = (sceneFrom.x + sceneTo.x) / 2;
  const midY = (sceneFrom.y + sceneTo.y) / 2;
  const midZ = (sceneFrom.z + sceneTo.z) / 2;
  const isVisited = (
    visitedFloorSet.has(fromFloor) &&
    visitedFloorSet.has(toFloor)
  ) || (fromFloor === currentFloor || toFloor === currentFloor);

  return {
    key: `${fromFloor}-${toFloor}`,
    axis,
    length,
    center: { x: midX, y: midY, z: midZ },
    isVisited,
  };
}

export function buildStudioTopologyRenderData({
  topology,
  sequence = [],
  currentFloor = 1,
  selectedFloor = currentFloor,
  visitedFloors = [],
  visibleFloorLimit = Number.POSITIVE_INFINITY,
  spacing = STUDIO_TOPOLOGY_SPACING,
} = {}) {
  const nodes = topology?.nodes && typeof topology.nodes === 'object'
    ? Object.values(topology.nodes)
        .filter(Boolean)
        .filter((node) => Math.max(1, Number(node.floorNumber) || 1) <= visibleFloorLimit)
        .sort((left, right) => (left.floorNumber ?? 0) - (right.floorNumber ?? 0))
    : [];

  if (!nodes.length) {
    return {
      nodes: [],
      segments: [],
      currentNode: null,
      selectedNode: null,
      bounds: null,
    };
  }

  const visitedFloorSet = new Set([...(visitedFloors ?? []), currentFloor]);
  const renderNodes = nodes.map((node) => {
    const floorNumber = Math.max(1, Number(node.floorNumber) || 1);
    const archetypeId = getArchetypeForFloor(sequence, floorNumber);
    const archetypeLabel = getStudioArchetypeLabel(archetypeId);
    const scenePosition = toStudioScenePosition(node.position, spacing);
    const nodeSize = getStudioNodeDimensions(spacing);
    const isCurrent = floorNumber === currentFloor;
    const isSelected = floorNumber === selectedFloor;
    const isVisited = visitedFloorSet.has(floorNumber);
    const isStart = floorNumber === 1;
    const displayLabel = isVisited
      ? formatStudioWithArchetype(floorNumber, archetypeId)
      : formatStudioLabel(floorNumber);

    return {
      floorNumber,
      position: {
        x: Number(node.position?.x) || 0,
        y: Number(node.position?.y) || 0,
        z: Number(node.position?.z) || 0,
      },
      scenePosition,
      nodeSize,
      archetypeId,
      archetypeLabel,
      displayLabel,
      relativeLabel: describeStudioRelativePosition(node.position),
      entryLabel: node.entryDirection
        ? getStudioTransitionLabel(node.entryTransitionStyle ?? 'passage', node.entryDirection)
        : null,
      exitLabel: node.exitDirection
        ? getStudioTransitionLabel(node.exitTransitionStyle ?? 'passage', node.exitDirection)
        : null,
      isCurrent,
      isSelected,
      isVisited,
      isStart,
    };
  });

  const segments = [];
  for (let index = 1; index < renderNodes.length; index += 1) {
    const previousNode = renderNodes[index - 1];
    const nextNode = renderNodes[index];
    segments.push(
      buildSegment(
        previousNode.scenePosition,
        nextNode.scenePosition,
        previousNode.floorNumber,
        nextNode.floorNumber,
        visitedFloorSet,
        currentFloor,
        previousNode.nodeSize,
        nextNode.nodeSize,
      ),
    );
  }

  const bounds = renderNodes.reduce((accumulator, node) => ({
    minX: Math.min(accumulator.minX, node.scenePosition.x),
    maxX: Math.max(accumulator.maxX, node.scenePosition.x),
    minY: Math.min(accumulator.minY, node.scenePosition.y),
    maxY: Math.max(accumulator.maxY, node.scenePosition.y),
    minZ: Math.min(accumulator.minZ, node.scenePosition.z),
    maxZ: Math.max(accumulator.maxZ, node.scenePosition.z),
  }), {
    minX: renderNodes[0].scenePosition.x,
    maxX: renderNodes[0].scenePosition.x,
    minY: renderNodes[0].scenePosition.y,
    maxY: renderNodes[0].scenePosition.y,
    minZ: renderNodes[0].scenePosition.z,
    maxZ: renderNodes[0].scenePosition.z,
  });

  return {
    nodes: renderNodes,
    segments,
    currentNode: renderNodes.find((node) => node.isCurrent) ?? renderNodes[0],
    selectedNode: renderNodes.find((node) => node.isSelected) ?? renderNodes.find((node) => node.isCurrent) ?? renderNodes[0],
    bounds,
  };
}

export function buildStudioFloorMapData({ floorState, TILE, currentFloor = 1, selectedFloor = 1 } = {}) {
  if (!floorState?.grid || !Array.isArray(floorState.grid) || !floorState.grid.length) {
    return {
      columns: 0,
      rows: 0,
      cells: [],
      exploredCount: 0,
      isVisited: false,
    };
  }

  const grid = floorState.grid;
  const explored = floorState.explored ?? Array.from({ length: grid.length }, () => Array(grid[0]?.length ?? 0).fill(true));
  const visible = floorState.visible ?? [];
  const doors = new Map((floorState.doors ?? []).map((door) => [keyOf(door.x, door.y), door]));
  const playerPosition = selectedFloor === currentFloor ? floorState.playerPosition ?? null : null;
  const entryPosition = floorState.entryAnchor?.transitionPosition ?? floorState.stairsUp ?? floorState.entryAnchor?.position ?? null;
  const exitPosition = floorState.exitAnchor?.transitionPosition ?? floorState.stairsDown ?? floorState.exitAnchor?.position ?? null;
  const cells = [];
  let exploredCount = 0;

  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < grid[y].length; x += 1) {
      const isExplored = Boolean(explored[y]?.[x]);
      const isVisible = Boolean(visible[y]?.[x]);
      let kind = 'unknown';

      if (isExplored) {
        exploredCount += 1;
        kind = grid[y][x] === TILE.WALL ? 'wall' : 'floor';

        if (doors.has(keyOf(x, y))) {
          kind = doors.get(keyOf(x, y)).isOpen ? 'door-open' : 'door-closed';
        }
        if (positionsMatch(entryPosition, { x, y })) {
          kind = 'entry';
        }
        if (positionsMatch(exitPosition, { x, y })) {
          kind = 'exit';
        }
        if (positionsMatch(playerPosition, { x, y })) {
          kind = 'player';
        }
      }

      cells.push({
        x,
        y,
        kind,
        isExplored,
        isVisible,
      });
    }
  }

  return {
    columns: grid[0]?.length ?? 0,
    rows: grid.length,
    cells,
    exploredCount,
    isVisited: true,
  };
}

function createSegmentMarkup(segment) {
  return `
    <div class="studio-topology-connector-anchor" style="transform: translate3d(${segment.center.x}px, ${segment.center.y}px, ${segment.center.z}px);">
      <div
        class="studio-topology-connector axis-${segment.axis}${segment.isVisited ? ' is-visited' : ' is-future'}"
        style="--connector-length: ${segment.length}px;"
      ></div>
    </div>
  `;
}

function createNodeMarkup(node) {
  const titleParts = [
    node.displayLabel,
    node.relativeLabel,
    `Koordinaten x ${node.position.x}, y ${node.position.y}, z ${node.position.z}`,
  ];
  if (node.entryLabel) {
    titleParts.push(`Eingang: ${node.entryLabel}`);
  }
  if (node.exitLabel) {
    titleParts.push(`Ausgang: ${node.exitLabel}`);
  }

  return `
    <div class="studio-topology-node-anchor" style="transform: translate3d(${node.scenePosition.x}px, ${node.scenePosition.y}px, ${node.scenePosition.z}px);">
      <div
        class="studio-topology-node${node.isSelected ? ' is-selected' : ''}${node.isStart ? ' is-start' : ''}${node.isVisited ? ' is-visited' : ' is-future'}"
        style="--studio-box-width: ${node.nodeSize.width}px; --studio-box-height: ${node.nodeSize.height}px; --studio-box-depth: ${node.nodeSize.depth}px;"
        title="${escapeHtml(titleParts.join(' | '))}"
      >
        <span class="studio-topology-cuboid">
          <span class="studio-topology-face studio-topology-face-front">
            <span class="studio-topology-floor">Studio ${node.floorNumber}</span>
            <strong>${escapeHtml(node.isVisited ? (node.archetypeLabel ?? 'Unbekannt') : 'Silhouette')}</strong>
          </span>
          <span class="studio-topology-face studio-topology-face-back" aria-hidden="true"></span>
          <span class="studio-topology-face studio-topology-face-left" aria-hidden="true"></span>
          <span class="studio-topology-face studio-topology-face-right" aria-hidden="true"></span>
          <span class="studio-topology-face studio-topology-face-top" aria-hidden="true"></span>
          <span class="studio-topology-face studio-topology-face-bottom" aria-hidden="true"></span>
        </span>
      </div>
    </div>
  `;
}

function renderSummary(summaryElement, renderData) {
  if (!summaryElement) {
    return;
  }

  if (!renderData.selectedNode) {
    summaryElement.innerHTML = '<div class="inventory-empty">Noch keine Studio-Topologie verfuegbar.</div>';
    return;
  }

  summaryElement.innerHTML = '';
}

function renderMiniMap(miniMapElement, floorMapData, selectedNode) {
  if (!miniMapElement) {
    return;
  }

  if (!selectedNode) {
    miniMapElement.innerHTML = '<div class="inventory-empty">Waehle ein Studio aus.</div>';
    return;
  }

  if (!selectedNode.isVisited || !floorMapData.isVisited || !floorMapData.columns) {
    miniMapElement.innerHTML = `
      <div class="studio-topology-minimap-meta">
        <strong>Studiokarte</strong>
      </div>
      <div class="studio-topology-minimap-empty">
        <span>Dieses Studio ist noch nicht betreten worden. Bisher ist nur seine Lage im Komplex bekannt.</span>
      </div>
    `;
    return;
  }

  miniMapElement.innerHTML = `
    <div class="studio-topology-minimap-meta">
      <strong>Studiokarte</strong>
    </div>
    <div class="studio-topology-minimap-grid" style="--map-columns: ${floorMapData.columns};">
      ${floorMapData.cells.map((cell) => `
        <span
          class="studio-topology-map-cell kind-${cell.kind}${cell.isVisible ? ' is-visible' : ''}"
          title="${cell.kind}"
        ></span>
      `).join('')}
    </div>
    <div class="studio-topology-minimap-legend">
      <span><i class="studio-topology-map-cell kind-floor"></i>Studiofl&auml;che</span>
      <span><i class="studio-topology-map-cell kind-wall"></i>Wand</span>
      <span><i class="studio-topology-map-cell kind-entry"></i>Einstieg</span>
      <span><i class="studio-topology-map-cell kind-exit"></i>Ausgang</span>
      <span><i class="studio-topology-map-cell kind-player"></i>Position</span>
    </div>
  `;
}

function renderSelector(selectorElement, renderData) {
  if (!selectorElement) {
    return;
  }

  if (!renderData.nodes.length) {
    selectorElement.innerHTML = '<div class="inventory-empty">Noch keine Studios verfuegbar.</div>';
    return;
  }

  const selectedNode = renderData.selectedNode ?? renderData.nodes[0];
  selectorElement.innerHTML = `
    <div class="studio-topology-selector-btn is-selected">
      <strong>${escapeHtml(selectedNode.displayLabel)}</strong>
    </div>
  `;
}

export function createStudioTopologyView(context) {
  const {
    studioTopologyViewportElement,
    studioTopologySceneElement,
    studioTopologySummaryElement,
    studioTopologySelectorElement,
    studioTopologyMiniMapElement,
    studioTopologyZoomRangeElement,
    studioTopologyZoomValueElement,
    studioTopologyPrevButtonElement,
    studioTopologyNextButtonElement,
    resetStudioTopologyViewButtonElement,
    getState,
    TILE,
  } = context;

  let rotationX = -24;
  let rotationY = 34;
  let zoom = DEFAULT_ZOOM_PERCENT / 100;
  let panX = 0;
  let panY = 0;
  let dragging = false;
  let interactionMode = 'rotate';
  let pointerId = null;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let selectedFloor = null;
  let lastModalOpen = false;
  let lastRenderedFloorOrder = [];

  function applySceneRotation() {
    if (!studioTopologySceneElement) {
      return;
    }

    studioTopologySceneElement.style.transform = `translate3d(${panX}px, ${panY}px, 0) scale3d(${zoom}, ${zoom}, ${zoom}) rotateX(${rotationX}deg) rotateY(${rotationY}deg)`;
  }

  function resetStudioTopologyView() {
    rotationX = -24;
    rotationY = 34;
    zoom = DEFAULT_ZOOM_PERCENT / 100;
    panX = 0;
    panY = 0;
    if (studioTopologyZoomRangeElement) {
      studioTopologyZoomRangeElement.value = String(DEFAULT_ZOOM_PERCENT);
    }
    if (studioTopologyZoomValueElement) {
      studioTopologyZoomValueElement.textContent = `${DEFAULT_ZOOM_PERCENT}%`;
    }
    applySceneRotation();
  }

  function selectFloor(floorNumber) {
    selectedFloor = Math.max(1, Number(floorNumber) || 1);
    renderStudioTopology();
  }

  function navigateSelection(step) {
    if (!lastRenderedFloorOrder.length) {
      return;
    }

    const currentIndex = Math.max(0, lastRenderedFloorOrder.findIndex((floorNumber) => floorNumber === selectedFloor));
    const nextIndex = clamp(currentIndex + step, 0, lastRenderedFloorOrder.length - 1);
    if (nextIndex === currentIndex) {
      return;
    }

    selectFloor(lastRenderedFloorOrder[nextIndex]);
  }

  function bindInteractions() {
    if (!studioTopologyViewportElement || !studioTopologySceneElement) {
      return;
    }

    studioTopologyViewportElement.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 && event.button !== 1 && event.button !== 2) {
        return;
      }

      dragging = true;
      interactionMode = event.button === 0 ? 'rotate' : 'pan';
      pointerId = event.pointerId;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      studioTopologyViewportElement.classList.add('is-dragging');
      studioTopologyViewportElement.setPointerCapture?.(event.pointerId);
    });

    studioTopologyViewportElement.addEventListener('pointermove', (event) => {
      if (!dragging || pointerId !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - lastPointerX;
      const deltaY = event.clientY - lastPointerY;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      if (interactionMode === 'pan') {
        panX += deltaX;
        panY += deltaY;
      } else {
        rotationY += deltaX * 0.48;
        rotationX = clamp(rotationX - (deltaY * 0.35), -76, 76);
      }
      applySceneRotation();
    });

    const releasePointer = (event) => {
      if (!dragging || pointerId !== event.pointerId) {
        return;
      }

      dragging = false;
      interactionMode = 'rotate';
      pointerId = null;
      studioTopologyViewportElement.classList.remove('is-dragging');
      studioTopologyViewportElement.releasePointerCapture?.(event.pointerId);
    };

    studioTopologyViewportElement.addEventListener('pointerup', releasePointer);
    studioTopologyViewportElement.addEventListener('pointercancel', releasePointer);
    studioTopologyViewportElement.addEventListener('contextmenu', (event) => event.preventDefault());

    studioTopologyPrevButtonElement?.addEventListener('click', () => navigateSelection(-1));
    studioTopologyNextButtonElement?.addEventListener('click', () => navigateSelection(1));

    studioTopologyZoomRangeElement?.addEventListener('input', () => {
      const nextPercent = Number(studioTopologyZoomRangeElement.value) || 100;
      zoom = clamp(nextPercent / 100, 0.7, 1.7);
      if (studioTopologyZoomValueElement) {
        studioTopologyZoomValueElement.textContent = `${Math.round(zoom * 100)}%`;
      }
      applySceneRotation();
    });

    resetStudioTopologyViewButtonElement?.addEventListener('click', () => resetStudioTopologyView());

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (event) => {
        const state = getState();
        if (!state.modals?.studioTopologyOpen) {
          return;
        }

        const targetTag = event.target instanceof HTMLElement ? event.target.tagName : '';
        if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') {
          return;
        }

        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          navigateSelection(-1);
        } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          navigateSelection(1);
        }
      });
    }
  }

  function renderStudioTopology() {
    if (!studioTopologySceneElement) {
      return;
    }

    const state = getState();
    const modalOpen = Boolean(state.modals?.studioTopologyOpen);
    if (modalOpen && !lastModalOpen) {
      selectedFloor = state.floor;
    }
    lastModalOpen = modalOpen;

    const visibleFloorLimit = Math.max(
      state.floor,
      state.deepestFloor ?? 1,
      ...(state.visitedFloors ?? []),
    );

    const effectiveSelectedFloor = state.runStudioTopology?.nodes?.[selectedFloor]
      && selectedFloor <= visibleFloorLimit
      ? selectedFloor
      : state.floor;

    const renderData = buildStudioTopologyRenderData({
      topology: state.runStudioTopology,
      sequence: state.runArchetypeSequence,
      currentFloor: state.floor,
      selectedFloor: effectiveSelectedFloor,
      visitedFloors: state.visitedFloors,
      visibleFloorLimit,
    });

    if (!renderData.nodes.length) {
      studioTopologySceneElement.innerHTML = '';
      renderSummary(studioTopologySummaryElement, renderData);
      renderMiniMap(studioTopologyMiniMapElement, { columns: 0, rows: 0, cells: [], isVisited: false, exploredCount: 0 }, null);
      return;
    }

    selectedFloor = renderData.selectedNode?.floorNumber ?? state.floor;
    lastRenderedFloorOrder = renderData.nodes.map((node) => node.floorNumber);
    studioTopologySceneElement.innerHTML = [
      renderData.segments.map((segment) => createSegmentMarkup(segment)).join(''),
      renderData.nodes.map((node) => createNodeMarkup(node)).join(''),
    ].join('');
    renderSummary(studioTopologySummaryElement, renderData);
    renderSelector(studioTopologySelectorElement, renderData);
    if (studioTopologyPrevButtonElement) {
      studioTopologyPrevButtonElement.disabled = lastRenderedFloorOrder[0] === selectedFloor;
    }
    if (studioTopologyNextButtonElement) {
      studioTopologyNextButtonElement.disabled = lastRenderedFloorOrder[lastRenderedFloorOrder.length - 1] === selectedFloor;
    }

    const selectedFloorState = state.floors?.[selectedFloor]
      ? {
          ...state.floors[selectedFloor],
          playerPosition: selectedFloor === state.floor
            ? { x: state.player.x, y: state.player.y }
            : null,
        }
      : null;

    renderMiniMap(
      studioTopologyMiniMapElement,
      buildStudioFloorMapData({
        floorState: selectedFloorState,
        TILE,
        currentFloor: state.floor,
        selectedFloor,
      }),
      renderData.selectedNode,
    );
    applySceneRotation();
  }

  bindInteractions();
  applySceneRotation();

  return {
    renderStudioTopology,
    resetStudioTopologyView,
  };
}
