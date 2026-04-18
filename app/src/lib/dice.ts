/**
 * SWADE dice logic — ported from fumbletable/savage-dice.
 *
 * Numeric die sides (4/6/8/10/12) are the native SWADE unit. DiceMesh uses
 * string labels ("d4"/"d6"/…) so converters bridge the two when wiring the
 * physics layer.
 */

import type { DieType as MeshDieType } from "../meshes/DiceMesh";

export type SwadeDie = 4 | 6 | 8 | 10 | 12;

export interface DieRoll {
  die: SwadeDie;
  chain: number[];
  total: number;
  aced: boolean;
}

export interface TraitResult {
  trait: DieRoll;
  wild: DieRoll | null;
  modifier: number;
  tn: number;
  best: "trait" | "wild";
  finalTotal: number;
  success: boolean;
  raises: number;
  criticalFailure: boolean;
}

export interface DamageResult {
  dice: DieRoll[];
  modifier: number;
  total: number;
}

const MAX_ACE_CHAIN = 50;

export function rollDie(die: SwadeDie): DieRoll {
  const chain: number[] = [];
  let roll = 0;
  let aced = false;
  do {
    roll = 1 + Math.floor(Math.random() * die);
    chain.push(roll);
    if (roll === die) aced = true;
  } while (roll === die && chain.length < MAX_ACE_CHAIN);
  return { die, chain, total: chain.reduce((a, b) => a + b, 0), aced };
}

export interface TraitCheckInput {
  traitDie: SwadeDie;
  wild: boolean;
  modifier: number;
  tn: number;
}

export function rollTraitCheck({ traitDie, wild, modifier, tn }: TraitCheckInput): TraitResult {
  const trait = rollDie(traitDie);
  const wildRoll = wild ? rollDie(6) : null;

  const traitFinal = trait.total + modifier;
  const wildFinal = wildRoll ? wildRoll.total + modifier : -Infinity;

  const best: "trait" | "wild" = wildRoll && wildFinal > traitFinal ? "wild" : "trait";
  const finalTotal = best === "wild" ? wildFinal : traitFinal;

  const criticalFailure = wildRoll
    ? trait.chain[0] === 1 && wildRoll.chain[0] === 1
    : false;

  const success = !criticalFailure && finalTotal >= tn;
  const raises = success ? Math.floor((finalTotal - tn) / 4) : 0;

  return {
    trait,
    wild: wildRoll,
    modifier,
    tn,
    best,
    finalTotal,
    success,
    raises,
    criticalFailure,
  };
}

export interface DamageInput {
  dice: SwadeDie[];
  modifier: number;
  bonusD6?: boolean;
}

export function rollDamage({ dice, modifier, bonusD6 }: DamageInput): DamageResult {
  const rolls = dice.map(rollDie);
  if (bonusD6) rolls.push(rollDie(6));
  const total = rolls.reduce((a, r) => a + r.total, 0) + modifier;
  return { dice: rolls, modifier, total };
}

// ─── Mesh ↔ SWADE conversions ────────────────────────────────────────────

export function swadeToMesh(die: SwadeDie): MeshDieType {
  return `d${die}` as MeshDieType;
}

export function meshToSwade(die: MeshDieType): SwadeDie {
  return Number(die.slice(1)) as SwadeDie;
}
