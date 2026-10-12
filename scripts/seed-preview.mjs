import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import { Pool } from "pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })),
});

const rarities = [
  "COMUM",
  "INCOMUM",
  "RARA",
  "EPICA",
  "LENDARIA",
  "MITICA",
  "GALACTICA",
];

try {
  const anime = await prisma.anime.upsert({
    where: { slug: "animesice-preview" },
    create: {
      slug: "animesice-preview",
      title: "Anime de Prévia",
      synopsis: "Catálogo local para conferir a animação do gacha.",
      coverImage: "/aeliana/Aeliana.png",
      bannerImage: "/aeliana/Aeliana-background.jpg",
      rating: 9.5,
      ageRating: "A14",
      status: "LANCAMENTO",
      studios: [],
      themes: [],
      alternativeTitles: [],
    },
    update: {
      title: "Anime de Prévia",
      coverImage: "/aeliana/Aeliana.png",
      bannerImage: "/aeliana/Aeliana-background.jpg",
    },
    select: { id: true, title: true, coverImage: true },
  });

  for (const [email, name, role] of [
    ["admin@example.com", "Admin Preview", "ADMIN"],
    ["user@example.com", "Jogador Preview", "USER"],
  ]) {
    const password = await bcrypt.hash(email.startsWith("admin") ? "Admin123!" : "User123!", 10);
    await prisma.user.upsert({
      where: { email },
      create: { email, name, role, password, isVerified: true },
      update: { name, role, password, isVerified: true },
    });
  }

  for (const [index, rarity] of rarities.entries()) {
    const malCharacterId = -96001 - index;
    const data = {
      name: `Prévia ${rarity}`,
      image: "/aeliana/Aeliana.png",
      rarity,
      animeId: anime.id,
      animeTitle: anime.title,
      source: "MANUAL",
      status: "ACTIVE",
    };
    await prisma.card.upsert({
      where: { malCharacterId },
      create: { malCharacterId, ...data },
      update: data,
    });
  }

  const cards = await prisma.card.findMany({
    where: { malCharacterId: { in: rarities.map((_, index) => -96001 - index) } },
    select: { rarity: true },
  });
  if (cards.length !== rarities.length || rarities.some((rarity) => !cards.some((card) => card.rarity === rarity))) {
    throw new Error("As cartas de prévia não foram criadas corretamente.");
  }

  const users = await prisma.user.count({ where: { email: { in: ["admin@example.com", "user@example.com"] }, isVerified: true } });
  if (users !== 2) throw new Error("As contas locais do preview não foram criadas corretamente.");

  console.log("Preview local pronto: catálogo, contas verificadas e 7 tiers do gacha semeados.");
} finally {
  await prisma.$disconnect();
}
