import RAPIER from "@dimforge/rapier3d-compat";
import type { Vec } from "../core/types";
export class Physics {
  world!: RAPIER.World;
  player!: RAPIER.RigidBody;
  collider!: RAPIER.Collider;
  car!: RAPIER.RigidBody;
  carCollider!: RAPIER.Collider;
  controller!: RAPIER.KinematicCharacterController;
  obstacles = new Map<string, RAPIER.Collider>();
  async init() {
    await RAPIER.init();
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(250, 0.5, 250).setTranslation(0, -0.5, 0),
    );
    this.player = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased(),
    );
    this.collider = this.world.createCollider(
      RAPIER.ColliderDesc.capsule(0.55, 0.35),
      this.player,
    );
    this.car = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased(),
    );
    this.carCollider = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(1.45, 1.1, 2.8),
      this.car,
    );
    this.controller = this.world.createCharacterController(0.04);
    this.controller.enableAutostep(0.3, 0.25, false);
    this.controller.enableSnapToGround(0.3);
    this.controller.setApplyImpulsesToDynamicBodies(true);
  }
  box(
    id: string,
    x: number,
    z: number,
    w: number,
    d: number,
    h = 3,
    rotation = 0,
    y = h / 2,
  ) {
    this.remove(id);
    const c = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2)
        .setTranslation(x, y, z)
        .setRotation({
          x: 0,
          y: Math.sin(rotation / 2),
          z: 0,
          w: Math.cos(rotation / 2),
        }),
    );
    this.obstacles.set(id, c);
  }
  remove(id: string) {
    const c = this.obstacles.get(id);
    if (c) {
      this.world.removeCollider(c, true);
      this.obstacles.delete(id);
    }
  }
  setPositions(player: Vec, car: Vec, angle: number) {
    this.player.setTranslation({ x: player.x, y: 0.94, z: player.z }, true);
    this.car.setTranslation({ x: car.x, y: 1.15, z: car.z }, true);
    this.car.setRotation(
      { x: 0, y: Math.sin(angle / 2), z: 0, w: Math.cos(angle / 2) },
      true,
    );
    this.world.step();
  }
  move(
    dx: number,
    dz: number,
    dt: number,
    driving: boolean,
    angle: number,
  ): Vec {
    const body = driving ? this.car : this.player,
      collider = driving ? this.carCollider : this.collider;
    if (driving) {
      this.collider.setEnabled(false);
      this.car.setRotation(
        { x: 0, y: Math.sin(angle / 2), z: 0, w: Math.cos(angle / 2) },
        true,
      );
    } else this.collider.setEnabled(true);
    this.controller.computeColliderMovement(collider, {
      x: dx,
      y: -9.81 * dt,
      z: dz,
    });
    const delta = this.controller.computedMovement(),
      p = body.translation();
    const next = {
      x: Math.max(-244, Math.min(244, p.x + delta.x)),
      y: driving ? 1.15 : 0.94,
      z: Math.max(-244, Math.min(244, p.z + delta.z)),
    };
    body.setNextKinematicTranslation(next);
    this.world.timestep = Math.min(0.05, Math.max(0.001, dt));
    this.world.step();
    return { x: next.x, z: next.z };
  }
  teleportPlayer(p: Vec) {
    this.player.setTranslation({ x: p.x, y: 0.94, z: p.z }, true);
    this.player.setNextKinematicTranslation({ x: p.x, y: 0.94, z: p.z });
    this.collider.setEnabled(true);
    this.world.step();
  }
  canStand(p: Vec) {
    return !this.world.intersectionWithShape(
      { x: p.x, y: 1, z: p.z },
      { x: 0, y: 0, z: 0, w: 1 },
      new RAPIER.Capsule(0.5, 0.35),
      undefined,
      undefined,
      this.collider,
    );
  }
}
