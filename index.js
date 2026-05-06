require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers // FIX
  ]
});

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const ADMIN_CHANNEL_ID = process.env.ADMIN_CHANNEL_ID;
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;

let mainMessageId;
const cooldown = new Map();

// ===== CHECK ADMIN =====
function isAdmin(member) {
  if (!member) return false;
  return member.roles.cache.has(ADMIN_ROLE_ID);
}

// ===== MAIN EMBED =====
function mainEmbed() {
  return new EmbedBuilder()
    .setAuthor({
      name: "✨ PREMIUM RESET SERVICE",
      iconURL: "https://cdn.discordapp.com/attachments/1488240958712709291/1500447316044156948/IMG_0441.png"
    })
    .setTitle("🔐 AUTO RESET KEY SYSTEM")
    .setDescription(
`╭───────────────⭓
│ 💎 Reset key tự động
│ ⚡ Nhanh - gọn - bảo mật
│ 🛡️ Hỗ trợ 24/7
╰───────────────⭓`
    )
    .addFields(
      {
        name: "📦 DANH MỤC",
        value: `> ➕ Fluorite\n> ➕ Proxy\n> ➕ Drip Client`,
        inline: true
      },
      {
        name: "📊 TRẠNG THÁI",
        value: `🟢 ONLINE`,
        inline: true
      },
      {
        name: "📌 HƯỚNG DẪN",
        value: "Nhấn **🗝️ Reset** để reset key"
      }
    )
    .setColor("#00eaff")
    .setThumbnail("https://cdn.discordapp.com/attachments/1488240958712709291/1500448459218747522/IMG_0469.gif")
    .setImage("https://cdn.discordapp.com/attachments/1488240958712709291/1500397539742978099/IMG_4659.gif")
    .setFooter({
      text: "© Premium Service • Auto System"
    })
    .setTimestamp();
}

// ===== READY =====
client.once("ready", async () => {
  console.log(`✅ ${client.user.tag}`);

  const channel = await client.channels.fetch(CHANNEL_ID);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("reset_key")
      .setLabel("Reset")
      .setEmoji("🗝️")
      .setStyle(ButtonStyle.Success)
  );

  const msgs = await channel.messages.fetch({ limit: 10 });
  const old = msgs.find(m => m.author.id === client.user.id);

  if (old) {
    mainMessageId = old.id;
    await old.edit({ embeds: [mainEmbed()], components: [row] });
  } else {
    const msg = await channel.send({
      embeds: [mainEmbed()],
      components: [row]
    });
    mainMessageId = msg.id;
  }
});

// ===== INTERACTION =====
client.on(Events.InteractionCreate, async (interaction) => {

  // ===== BUTTON RESET =====
  if (interaction.isButton() && interaction.customId === "reset_key") {

    const userId = interaction.user.id;

    if (cooldown.has(userId)) {
      const time = (cooldown.get(userId) - Date.now()) / 1000;
      if (time > 0) {
        return interaction.reply({
          content: `⏳ Vui lòng đợi ${time.toFixed(1)}s`,
          ephemeral: true
        });
      }
    }

    cooldown.set(userId, Date.now() + 30000);

    const select = new StringSelectMenuBuilder()
      .setCustomId("select_key")
      .setPlaceholder("Chọn loại key")
      .addOptions([
        { label: "Fluorite", value: "Fluorite" },
        { label: "Proxy", value: "Proxy" },
        { label: "Drip Client", value: "Drip Client" }
      ]);

    await interaction.reply({
      content: "📌 Chọn loại key:",
      components: [new ActionRowBuilder().addComponents(select)],
      ephemeral: true
    });
  }

  // ===== SELECT =====
  if (interaction.isStringSelectMenu()) {

    const type = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(`modal_${type}`)
      .setTitle("Nhập key");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("key")
          .setLabel("Nhập key của bạn")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );

    await interaction.showModal(modal);
  }

  // ===== USER SUBMIT =====
  if (interaction.isModalSubmit() && interaction.customId.startsWith("modal_")) {

    const type = interaction.customId.replace("modal_", "");
    const key = interaction.fields.getTextInputValue("key");
    const encodedKey = Buffer.from(key).toString("base64");

    const embed = new EmbedBuilder()
      .setColor("#ffcc00")
      .setAuthor({
        name: "📩 NEW RESET REQUEST",
        iconURL: interaction.user.displayAvatarURL()
      })
      .addFields(
        { name: "👤 User", value: `> ${interaction.user.tag}`, inline: true },
        { name: "📦 Type", value: `> ${type}`, inline: true },
        { name: "🔑 Key", value: `\`${key}\`` },
        { name: "📊 Status", value: "🟡 WAITING" }
      )
      .setFooter({ text: `ID: ${interaction.user.id}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ok_${interaction.user.id}_${type}_${encodedKey}`)
        .setLabel("Accept")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`no_${interaction.user.id}_${type}_${encodedKey}`)
        .setLabel("Deny")
        .setStyle(ButtonStyle.Danger)
    );

    const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);
    const msg = await adminChannel.send({ embeds: [embed], components: [row] });

    // FIX: gắn messageId vào button
    const newRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ok_${interaction.user.id}_${type}_${encodedKey}_${msg.id}`)
        .setLabel("Accept")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`no_${interaction.user.id}_${type}_${encodedKey}_${msg.id}`)
        .setLabel("Deny")
        .setStyle(ButtonStyle.Danger)
    );

    await msg.edit({ components: [newRow] });

    await interaction.reply({ content: "✅ Đã gửi yêu cầu!", ephemeral: true });
  }

  // ===== DENY =====
  if (interaction.isButton() && interaction.customId.startsWith("no_")) {

    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: "❌ Không có quyền", ephemeral: true });
    }

    const [_, userId, type, encodedKey, messageId] = interaction.customId.split("_");
    const key = Buffer.from(encodedKey, "base64").toString("utf8");

    const msg = await interaction.channel.messages.fetch(messageId);

    const embed = EmbedBuilder.from(msg.embeds[0])
      .setColor("#ff3b3b")
      .spliceFields(3, 1, {
        name: "📊 Status",
        value: "❌ REJECTED"
      });

    await msg.edit({ embeds: [embed], components: [] });

    const user = await client.users.fetch(userId);

    user.send({
      embeds: [
        new EmbedBuilder()
          .setColor("#ff3b3b")
          .setAuthor({
            name: "❌ YÊU CẦU BỊ TỪ CHỐI",
            iconURL: client.user.displayAvatarURL()
          })
          .addFields(
            { name: "📦 Type", value: `> ${type}` },
            { name: "🔑 Key đã gửi", value: `\`${key}\`` },
            { name: "📊 Status", value: "❌ Key đã reset 3/3 | invalid" }
          )
          .setFooter({ text: "Liên hệ admin nếu cần hỗ trợ" })
          .setTimestamp()
      ]
    });

    await interaction.deferUpdate();
  }

  // ===== ACCEPT =====
  if (interaction.isButton() && interaction.customId.startsWith("ok_")) {

    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: "❌ Không có quyền", ephemeral: true });
    }

    const [_, userId, type, encodedKey, messageId] = interaction.customId.split("_");

    const modal = new ModalBuilder()
      .setCustomId(`admin_${userId}_${type}_${encodedKey}_${messageId}`)
      .setTitle("Nhập key mới");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("newkey")
          .setLabel("Key mới")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );

    await interaction.showModal(modal);
  }

  // ===== ADMIN SUBMIT =====
  if (interaction.isModalSubmit() && interaction.customId.startsWith("admin_")) {

    const [_, userId, type, encodedKey, messageId] = interaction.customId.split("_");
    const oldKey = Buffer.from(encodedKey, "base64").toString("utf8");
    const newKey = interaction.fields.getTextInputValue("newkey");

    const msg = await interaction.channel.messages.fetch(messageId);

    const embed = EmbedBuilder.from(msg.embeds[0])
      .setColor("#00ff99")
      .spliceFields(3, 1, {
        name: "📊 Status",
        value: "✅ SUCCESS"
      })
      .addFields({
        name: "🆕 New Key",
        value: `\`${newKey}\``
      });

    await msg.edit({ embeds: [embed], components: [] });

    const user = await client.users.fetch(userId);

    user.send({
      embeds: [
        new EmbedBuilder()
          .setColor("#00ff99")
          .setAuthor({
            name: "🎉 RESET THÀNH CÔNG",
            iconURL: client.user.displayAvatarURL()
          })
          .addFields(
            { name: "📦 Type", value: `> ${type}` },
            { name: "🔑 Key cũ", value: `\`${oldKey}\`` },
            { name: "🆕 Key mới", value: `\`${newKey}\`` },
            { name: "📊 Status", value: "✅ SUCCESS" }
          )
          .setFooter({ text: "Cảm ơn bạn đã sử dụng dịch vụ 💎" })
          .setTimestamp()
      ]
    });

    await interaction.deferUpdate();
  }

});

client.login(TOKEN);
