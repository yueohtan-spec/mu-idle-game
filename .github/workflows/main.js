class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    // Tự động sinh texture đồ họa nội bộ phong cách Dark Fantasy
    this.createProceduralTextures();
  }

  createProceduralTextures() {
    // 1. Nhân vật Dark Knight (Giáp Đỏ Rồng)
    const heroGfx = this.make.graphics({ x: 0, y: 0, add: false });
    heroGfx.fillStyle(0xb22222, 1); // Giáp đỏ
    heroGfx.fillCircle(20, 20, 16);
    heroGfx.fillStyle(0xffd700, 1); // Cánh vàng kim
    heroGfx.fillTriangle(4, 8, 4, 32, -8, 20);
    heroGfx.fillTriangle(36, 8, 36, 32, 48, 20);
    heroGfx.generateTexture('hero', 40, 40);

    // 2. Quái vật Nhện Độc Lorencia
    const mobGfx = this.make.graphics({ x: 0, y: 0, add: false });
    mobGfx.fillStyle(0x2e8b57, 1);
    mobGfx.fillCircle(15, 15, 12);
    mobGfx.fillStyle(0x000000, 1);
    mobGfx.fillCircle(10, 10, 3);
    mobGfx.fillCircle(20, 10, 3);
    mobGfx.generateTexture('spider', 30, 30);

    // 3. Hiệu ứng Twisting Slash (Xoay kiếm)
    const slashGfx = this.make.graphics({ x: 0, y: 0, add: false });
    slashGfx.lineStyle(4, 0x00ffff, 0.8);
    slashGfx.strokeCircle(50, 50, 45);
    slashGfx.lineStyle(2, 0xffffff, 0.9);
    slashGfx.strokeCircle(50, 50, 35);
    slashGfx.generateTexture('slash_fx', 100, 100);

    // 4. Vật phẩm rơi: Zen & Jewel of Bless
    const zenGfx = this.make.graphics({ x: 0, y: 0, add: false });
    zenGfx.fillStyle(0xffd700, 1);
    zenGfx.fillCircle(8, 8, 7);
    zenGfx.generateTexture('loot_zen', 16, 16);

    const blessGfx = this.make.graphics({ x: 0, y: 0, add: false });
    blessGfx.fillStyle(0x9400d3, 1);
    blessGfx.fillTriangle(8, 0, 16, 16, 0, 16);
    blessGfx.generateTexture('loot_bless', 16, 16);
  }

  create() {
    this.w = this.cameras.main.width;
    this.h = this.cameras.main.height;

    // Chỉ số nhân vật
    this.stats = {
      level: 1,
      exp: 0,
      nextExp: 100,
      zen: 0,
      bless: 0,
      atk: 45,
      critRate: 0.25,
      hp: 500,
      maxHp: 500
    };

    // Tạo sàn đấu Lorencia
    this.add.rectangle(this.w / 2, this.h / 2, this.w, this.h, 0x141619);
    for (let i = 0; i < 25; i++) {
      const x = Phaser.Math.Between(20, this.w - 20);
      const y = Phaser.Math.Between(80, this.h - 100);
      this.add.rectangle(x, y, 4, 4, 0x282c34);
    }

    // Nhóm quái và vật phẩm
    this.enemies = this.physics.add.group();
    this.loots = this.physics.add.group();

    // Tạo Hero
    this.hero = this.physics.add.sprite(this.w / 2, this.h / 2, 'hero');
    this.hero.setCollideWorldBounds(true);

    // Vòng phát sáng của đồ +15 dưới chân Hero
    this.glowRing = this.add.ellipse(this.hero.x, this.hero.y + 15, 36, 16, 0x00ffff, 0.4);

    // Kỹ năng Twisting Slash Sprite
    this.slashSprite = this.add.sprite(this.hero.x, this.hero.y, 'slash_fx');
    this.slashSprite.setVisible(false);

    // Giao diện HUD
    this.createHUD();

    // Vòng lặp tự động tìm quái và xuất chiêu
    this.time.addEvent({
      delay: 700,
      callback: this.autoCombatLoop,
      callbackScope: this,
      loop: true
    });

    // Vòng lặp sinh quái (Waves)
    this.time.addEvent({
      delay: 2000,
      callback: this.spawnWave,
      callbackScope: this,
      loop: true
    });

    // Sinh quái ban đầu
    this.spawnWave();
  }

  createHUD() {
    const headerBg = this.add.rectangle(this.w / 2, 35, this.w, 70, 0x0a0c10, 0.85);
    headerBg.setDepth(10);

    this.levelText = this.add.text(16, 12, `Lv.1 Dark Knight`, {
      font: 'bold 15px Arial',
      fill: '#ffd700'
    }).setDepth(11);

    this.expText = this.add.text(16, 32, `EXP: 0 / 100`, {
      font: '12px Arial',
      fill: '#00ffcc'
    }).setDepth(11);

    this.zenText = this.add.text(this.w - 16, 12, `Zen: 0`, {
      font: 'bold 14px Arial',
      fill: '#ffec8b',
      align: 'right'
    }).setOrigin(1, 0).setDepth(11);

    this.blessText = this.add.text(this.w - 16, 32, `Bless: 0`, {
      font: 'bold 13px Arial',
      fill: '#da70d6',
      align: 'right'
    }).setOrigin(1, 0).setDepth(11);

    // Thông báo ải
    this.stageBanner = this.add.text(this.w / 2, 85, 'ẢI 1: LORENCIA NGOẠI THÀNH', {
      font: 'bold 13px Arial',
      fill: '#888888'
    }).setOrigin(0.5).setDepth(10);
  }

  spawnWave() {
    if (this.enemies.countActive(true) >= 8) return;

    for (let i = 0; i < 3; i++) {
      const x = Phaser.Math.Between(40, this.w - 40);
      const y = Phaser.Math.Between(120, this.h - 120);
      const enemy = this.enemies.create(x, y, 'spider');
      enemy.hp = 100 + this.stats.level * 15;
      enemy.maxHp = enemy.hp;
      enemy.setImmovable(true);
    }
  }

  autoCombatLoop() {
    // Tìm mục tiêu quái gần nhất
    const target = this.getClosestEnemy();

    if (!target) return;

    const distance = Phaser.Math.Distance.Between(this.hero.x, this.hero.y, target.x, target.y);

    if (distance > 65) {
      // Di chuyển lại gần mục tiêu
      this.physics.moveToObject(this.hero, target, 130);
    } else {
      // Dừng lại và tung chiêu Twisting Slash
      this.hero.body.reset(this.hero.x, this.hero.y);
      this.castTwistingSlash();
    }
  }

  getClosestEnemy() {
    let closest = null;
    let minDistance = Infinity;

    this.enemies.children.each((enemy) => {
      if (enemy.active) {
        const dist = Phaser.Math.Distance.Between(this.hero.x, this.hero.y, enemy.x, enemy.y);
        if (dist < minDistance) {
          minDistance = dist;
          closest = enemy;
        }
      }
    });

    return closest;
  }

  castTwistingSlash() {
    // Hiệu ứng vòng xoay kiếm
    this.slashSprite.setPosition(this.hero.x, this.hero.y);
    this.slashSprite.setVisible(true);
    this.slashSprite.setScale(0.7);

    this.tweens.add({
      targets: this.slashSprite,
      angle: 360,
      scale: 1.2,
      duration: 250,
      onComplete: () => {
        this.slashSprite.setVisible(false);
        this.slashSprite.setAngle(0);
      }
    });

    // Gây sát thương diện rộng lên các quái xung quanh trong phạm vi 90px
    this.enemies.children.each((enemy) => {
      if (enemy.active) {
        const dist = Phaser.Math.Distance.Between(this.hero.x, this.hero.y, enemy.x, enemy.y);
        if (dist <= 95) {
          this.applyDamage(enemy);
        }
      }
    });
  }

  applyDamage(enemy) {
    const isCrit = Math.random() < this.stats.critRate;
    const baseDamage = this.stats.atk + Phaser.Math.Between(-5, 10);
    const finalDamage = isCrit ? Math.floor(baseDamage * 1.7) : baseDamage;

    enemy.hp -= finalDamage;

    // Hiển thị số sát thương nhảy lên
    this.showDamageText(enemy.x, enemy.y, finalDamage, isCrit);

    if (enemy.hp <= 0) {
      this.onEnemyKilled(enemy);
    }
  }

  showDamageText(x, y, damage, isCrit) {
    const color = isCrit ? '#00ff66' : '#ffff00'; // Xanh lá chí mạng chuẩn MU
    const text = isCrit ? `Crit! ${damage}` : `${damage}`;

    const dmgText = this.add.text(x + Phaser.Math.Between(-10, 10), y - 10, text, {
      font: `bold ${isCrit ? 16 : 13}px Arial`,
      fill: color
    }).setOrigin(0.5);

    this.tweens.add({
      targets: dmgText,
      y: y - 40,
      alpha: 0,
      duration: 650,
      onComplete: () => dmgText.destroy()
    });
  }

  onEnemyKilled(enemy) {
    const ex = enemy.x;
    const ey = enemy.y;
    enemy.destroy();

    // Rơi Zen (tỷ lệ 80%)
    if (Math.random() < 0.8) {
      const zen = this.loots.create(ex, ey, 'loot_zen');
      zen.type = 'zen';
      zen.amount = Phaser.Math.Between(15, 35) * this.stats.level;
    }

    // Rơi Ngọc Jewel of Bless (tỷ lệ 15%)
    if (Math.random() < 0.15) {
      const bless = this.loots.create(ex + 10, ey, 'loot_bless');
      bless.type = 'bless';
      bless.amount = 1;
    }

    // Tự động thu thập sau 400ms
    this.time.delayedCall(400, () => this.collectLoots());

    // Tăng kinh nghiệm (EXP)
    this.gainExp(30);
  }

  collectLoots() {
    this.loots.children.each((item) => {
      if (item.active) {
        this.tweens.add({
          targets: item,
          x: this.hero.x,
          y: this.hero.y,
          duration: 300,
          onComplete: () => {
            if (item.type === 'zen') {
              this.stats.zen += item.amount;
              this.zenText.setText(`Zen: ${this.stats.zen}`);
            } else if (item.type === 'bless') {
              this.stats.bless += item.amount;
              this.blessText.setText(`Bless: ${this.stats.bless}`);
            }
            item.destroy();
          }
        });
      }
    });
  }

  gainExp(amount) {
    this.stats.exp += amount;
    if (this.stats.exp >= this.stats.nextExp) {
      this.stats.exp -= this.stats.nextExp;
      this.stats.level++;
      this.stats.nextExp = Math.floor(this.stats.nextExp * 1.5);
      this.stats.atk += 12;

      this.levelText.setText(`Lv.${this.stats.level} Dark Knight`);

      // Hiệu ứng thăng cấp
      const lvUp = this.add.text(this.hero.x, this.hero.y - 30, 'LEVEL UP!', {
        font: 'bold 18px Arial',
        fill: '#ffd700'
      }).setOrigin(0.5);

      this.tweens.add({
        targets: lvUp,
        y: this.hero.y - 70,
        alpha: 0,
        duration: 900,
        onComplete: () => lvUp.destroy()
      });
    }

    this.expText.setText(`EXP: ${this.stats.exp} / ${this.stats.nextExp}`);
  }

  update() {
    // Vòng sáng luôn bám theo chân nhân vật
    if (this.glowRing && this.hero) {
      this.glowRing.setPosition(this.hero.x, this.hero.y + 16);
    }
  }
}

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 420,
  height: 750,
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scene: [GameScene]
};

new Phaser.Game(config);