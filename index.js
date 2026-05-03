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
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const ADMIN_CHANNEL_ID = process.env.ADMIN_CHANNEL_ID;
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;

let mainMessageId;
const cooldown = new Map();

// ===== CHECK ADMIN =====
function isAdmin(member) {
  return member.roles.cache.has(ADMIN_ROLE_ID);
}

// ===== MAIN EMBED =====
function mainEmbed() {
  return new EmbedBuilder()
    .setAuthor({
      name: "✨ PREMIUM RESET SERVICE",
      iconURL: client.user.displayAvatarURL()
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
        value:
`> 🔹 Fluorite  
> 🔹 Proxy  
> 🔹 Drip Client`,
        inline: true
      },
      {
        name: "📊 TRẠNG THÁI",
        value:
`🟢 ONLINE  
⚡ Stable`,
        inline: true
      },
      {
        name: "📌 HƯỚNG DẪN",
        value: "Nhấn **🔑 Reset Key** để bắt đầu"
      }
    )
    .setColor("#00eaff")
    .setThumbnail(client.user.displayAvatarURL())
    .setImage("https://i.imgur.com/8wKQZ5L.gif")
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
      .setLabel("Reset Key")
      .setEmoji("🔑")
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

  // ===== BUTTON =====
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

    const embed = new EmbedBuilder()
      .setColor("#ffcc00")
      .setAuthor({
        name: "📩 NEW RESET REQUEST",
        iconURL: interaction.user.displayAvatarURL()
      })
      .addFields(
        {
          name: "👤 User",
          value: `> ${interaction.user.tag}`,
          inline: true
        },
        {
          name: "📦 Type",
          value: `> ${type}`,
          inline: true
        },
        {
          name: "🔑 Key",
          value: `\`${key}\``
        },
        {
          name: "📊 Status",
          value: "🟡 WAITING"
        }
      )
      .setFooter({
        text: `ID: ${interaction.user.id}`
      })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ok_${interaction.user.id}_${type}_${key}`)
        .setLabel("Accept")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`no_${interaction.user.id}_${type}_${key}`)
        .setLabel("Deny")
        .setStyle(ButtonStyle.Danger)
    );

    const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);
    await adminChannel.send({ embeds: [embed], components: [row] });

    await interaction.reply({ content: "✅ Đã gửi yêu cầu!", ephemeral: true });
  }

  // ===== DENY =====
  if (interaction.isButton() && interaction.customId.startsWith("no_")) {

    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: "❌ Không có quyền", ephemeral: true });
    }

    const [_, userId, type, key] = interaction.customId.split("_");

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setColor("#ff3b3b")
      .spliceFields(3, 1, {
        name: "📊 Status",
        value: "❌ REJECTED"
      });

    await interaction.update({ embeds: [embed], components: [] });

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
            {
              name: "📦 Type",
              value: `> ${type}`
            },
            {
              name: "🔑 Key đã gửi",
              value: `\`${key}\``
            },
            {
              name: "📊 Status",
              value: "❌ REJECTED"
            }
          )
          .setFooter({
            text: "Liên hệ admin nếu cần hỗ trợ"
          })
          .setTimestamp()
      ]
    });
  }

  // ===== ACCEPT =====
  if (interaction.isButton() && interaction.customId.startsWith("ok_")) {

    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: "❌ Không có quyền", ephemeral: true });
    }

    const [_, userId, type, oldKey] = interaction.customId.split("_");

    const modal = new ModalBuilder()
      .setCustomId(`admin_${userId}_${type}_${oldKey}`)
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

    const [_, userId, type, oldKey] = interaction.customId.split("_");
    const newKey = interaction.fields.getTextInputValue("newkey");

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setColor("#00ff99")
      .spliceFields(3, 1, {
        name: "📊 Status",
        value: "✅ SUCCESS"
      })
      .addFields({
        name: "🆕 New Key",
        value: `\`${newKey}\``
      });

    await interaction.update({ embeds: [embed], components: [] });

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
            {
              name: "📦 Type",
              value: `> ${type}`
            },
            {
              name: "🔑 Key cũ",
              value: `\`${oldKey}\``
            },
            {
              name: "🆕 Key mới",
              value: `\`${newKey}\``
            },
            {
              name: "📊 Status",
              value: "✅ SUCCESS"
            }
          )
          .setFooter({
            text: "Cảm ơn bạn đã sử dụng dịch vụ 💎"
          })
          .setTimestamp()
      ]
    });
  }

});

client.login(TOKEN);
