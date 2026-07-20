// Atualização do HUD (barras, contadores, mensagens, vinhetas).

const el = (id) => document.getElementById(id);

export class Hud {
  constructor() {
    this.hpFill = el('hp-fill');
    this.stFill = el('st-fill');
    this.saFill = el('sa-fill');
    this.objective = el('objective');
    this.weaponName = el('weapon-name');
    this.blocksCount = el('blocks-count');
    this.waterCount = el('water-count');
    this.msg = el('msg');
    this.dmgVignette = el('dmg-vignette');
    this.sanityVignette = el('sanity-vignette');
    this.root = el('hud');
    this._msgTimer = null;
    this._dmgPulse = 0;
  }

  show() { this.root.classList.remove('hidden'); }
  hide() { this.root.classList.add('hidden'); }

  setWeapon(w) { this.weaponName.textContent = `${w.icon} ${w.name}`; }

  update(player, dt) {
    this.hpFill.style.transform = `scaleX(${player.hp / player.maxHp})`;
    this.stFill.style.transform = `scaleX(${player.stamina / 100})`;
    this.saFill.style.transform = `scaleX(${player.sanity / 100})`;
    this.blocksCount.textContent = `🧱 ${player.blocks}`;
    this.waterCount.textContent = `🥤 ${player.water}`;

    if (this._dmgPulse > 0) {
      this._dmgPulse -= dt;
      this.dmgVignette.style.opacity = Math.min(1, this._dmgPulse * 2.4);
    } else {
      // vinheta permanente quando a vida está baixa
      this.dmgVignette.style.opacity = player.hp < 30 ? 0.35 : 0;
    }
    const san = player.sanity;
    this.sanityVignette.style.opacity = san < 55 ? (55 - san) / 55 * 0.9 : 0;
  }

  setObjective(text) { this.objective.textContent = text; }

  damageFlash() { this._dmgPulse = 0.6; }

  showMessage(text, ms = 2600) {
    this.msg.textContent = text;
    this.msg.style.opacity = 1;
    if (this._msgTimer) clearTimeout(this._msgTimer);
    this._msgTimer = setTimeout(() => { this.msg.style.opacity = 0; }, ms);
  }
}
