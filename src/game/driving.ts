import { onIsland, spawn, type Breakable, type Footprint } from './layout';

export interface DriveInput {
  throttle: number;
  steering: number;
  brake: boolean;
  boost: boolean;
  jump: boolean;
}

const emptyInput: DriveInput = { throttle: 0, steering: 0, brake: false, boost: false, jump: false };

export function createDriving(buildings: readonly Footprint[], props: readonly Breakable[]) {
  const state = { ...spawn, speed: 0, steer: 0, height: 0, braking: false };
  let verticalSpeed = 0;
  let jumpHeld = false;

  function intersects(x: number, z: number, obstacle: Footprint) {
    const dx = x - obstacle.x;
    const dz = z - obstacle.z;
    const reach = 2.4 + obstacle.halfX + obstacle.halfZ;
    if (Math.abs(dx) > reach || Math.abs(dz) > reach) return false;

    const angle = obstacle.angle ?? 0;
    const sine = Math.sin(state.heading - angle);
    const cosine = Math.cos(state.heading - angle);
    const offsetX = dx * Math.cos(angle) - dz * Math.sin(angle);
    const offsetZ = dx * Math.sin(angle) + dz * Math.cos(angle);
    const halfWidth = .97;
    const halfLength = 2.18;
    return Math.abs(offsetX) < obstacle.halfX + halfWidth * Math.abs(cosine) + halfLength * Math.abs(sine)
      && Math.abs(offsetZ) < obstacle.halfZ + halfWidth * Math.abs(sine) + halfLength * Math.abs(cosine)
      && Math.abs(offsetX * cosine - offsetZ * sine) < halfWidth + obstacle.halfX * Math.abs(cosine) + obstacle.halfZ * Math.abs(sine)
      && Math.abs(offsetX * sine + offsetZ * cosine) < halfLength + obstacle.halfX * Math.abs(sine) + obstacle.halfZ * Math.abs(cosine);
  }

  const free = (x: number, z: number) => onIsland(x, z, 1.9) && buildings.every(building => !intersects(x, z, building));

  function move(x: number, z: number) {
    if (!free(x, z)) return false;
    const speed = Math.abs(state.speed);
    const direction = Math.sign(state.speed) || 1;
    for (const prop of props) {
      if (prop.broken || state.height >= prop.height || !intersects(x, z, prop)) continue;
      prop.smash({
        directionX: Math.sin(state.heading) * direction,
        directionZ: Math.cos(state.heading) * direction,
        speed,
      });
    }
    state.x = x;
    state.z = z;
    return true;
  }

  function step(dt: number, input = emptyInput): void {
    const { throttle, steering, brake, boost, jump } = input;
    const maxSpeed = boost ? 25 : 17;
    state.steer += (steering - state.steer) * (1 - Math.exp(-dt * 10));
    state.braking = brake || (throttle !== 0 && Math.abs(state.speed) > .4 && Math.sign(state.speed) !== throttle);
    if (state.braking || throttle === 0) {
      const deceleration = state.braking ? 29 : 6.8;
      state.speed = Math.sign(state.speed) * Math.max(0, Math.abs(state.speed) - deceleration * dt);
    } else {
      const acceleration = throttle < 0 ? 11 : boost ? 23 : 16;
      const forwardLimit = Math.max(maxSpeed, state.speed - dt * 9);
      state.speed = Math.max(-8, Math.min(forwardLimit, state.speed + throttle * acceleration * dt));
    }

    if (jump && !jumpHeld && state.height === 0) verticalSpeed = 6.8;
    jumpHeld = jump;
    if (state.height > 0 || verticalSpeed > 0) {
      state.height = Math.max(0, state.height + verticalSpeed * dt);
      verticalSpeed = state.height > 0 ? verticalSpeed - 19 * dt : 0;
    }

    const initialHeading = state.heading;
    state.heading += state.steer * state.speed * dt * .235 * (1 - Math.min(Math.abs(state.speed) / 48, .45));
    if (!free(state.x, state.z)) state.heading = initialHeading;
    const travel = state.speed * dt;
    const steps = Math.max(1, Math.ceil(Math.abs(travel) / .2));
    const dx = Math.sin(state.heading) * travel / steps;
    const dz = Math.cos(state.heading) * travel / steps;
    for (let index = 0; index < steps; index += 1) {
      if (!move(state.x + dx, state.z + dz)) {
        const x = state.x + dx;
        const z = state.z + dz;
        move(x, state.z);
        move(state.x, z);
        state.speed *= .46;
        break;
      }
    }
  }

  function place(pose = spawn) {
    Object.assign(state, pose, { speed: 0, steer: 0, height: 0, braking: false });
    verticalSpeed = 0;
    jumpHeld = false;
  }

  return { state, step, place };
}
