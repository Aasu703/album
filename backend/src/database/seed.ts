/**
 * Standalone dev/test data seeder — run with `npm run seed` from backend/.
 * Connects to MongoDB directly (bypassing Nest's DI) and repopulates the
 * users, artworks, reactions, and comments collections so every feature
 * (auth, roles, seller approval, banning, MFA, reactions, comments) has
 * ready-made data to exercise.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { UserMongooseSchema, UserSchemaClass } from '../users/infrastructure/user.schema';
import { ArtworkMongooseSchema, ArtworkSchemaClass } from '../artworks/infrastructure/artwork.schema';
import {
  ALLOWED_EMOJIS,
  ReactionMongooseSchema,
  ReactionSchemaClass,
} from '../engagement/infrastructure/reaction.schema';
import { CommentMongooseSchema, CommentSchemaClass } from '../engagement/infrastructure/comment.schema';

const SEED_PASSWORD = 'Password123!';

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sample<T>(arr: readonly T[], count: number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  while (result.length < count && copy.length > 0) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

interface UserSeed {
  email: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'VERIFIED_ARTIST' | 'ADMIN';
  sellerStatus: 'none' | 'pending' | 'approved' | 'rejected';
  isBanned?: boolean;
  bannedReason?: string;
  isMfaEnabled?: boolean;
}

const USER_SEEDS: UserSeed[] = [
  { email: 'admin@gallery.test', firstName: 'Ada', lastName: 'Admin', role: 'ADMIN', sellerStatus: 'none' },
  { email: 'ava.artist@gallery.test', firstName: 'Ava', lastName: 'Rowen', role: 'VERIFIED_ARTIST', sellerStatus: 'approved' },
  { email: 'liam.artist@gallery.test', firstName: 'Liam', lastName: 'Solace', role: 'VERIFIED_ARTIST', sellerStatus: 'approved' },
  { email: 'maya.artist@gallery.test', firstName: 'Maya', lastName: 'Indigo', role: 'VERIFIED_ARTIST', sellerStatus: 'approved' },
  { email: 'noah.artist@gallery.test', firstName: 'Noah', lastName: 'Sable', role: 'VERIFIED_ARTIST', sellerStatus: 'approved' },
  { email: 'zoe.artist@gallery.test', firstName: 'Zoe', lastName: 'Vermeer', role: 'VERIFIED_ARTIST', sellerStatus: 'approved' },
  { email: 'ethan.buyer@gallery.test', firstName: 'Ethan', lastName: 'Park', role: 'USER', sellerStatus: 'none' },
  { email: 'olivia.buyer@gallery.test', firstName: 'Olivia', lastName: 'Chen', role: 'USER', sellerStatus: 'none' },
  { email: 'lucas.buyer@gallery.test', firstName: 'Lucas', lastName: 'Novak', role: 'USER', sellerStatus: 'none' },
  { email: 'priya.buyer@gallery.test', firstName: 'Priya', lastName: 'Menon', role: 'USER', sellerStatus: 'none' },
  { email: 'mia.pending@gallery.test', firstName: 'Mia', lastName: 'Alvarez', role: 'USER', sellerStatus: 'pending' },
  { email: 'jack.rejected@gallery.test', firstName: 'Jack', lastName: 'Ferro', role: 'USER', sellerStatus: 'rejected' },
  {
    email: 'banned.user@gallery.test',
    firstName: 'Bea',
    lastName: 'Banned',
    role: 'USER',
    sellerStatus: 'none',
    isBanned: true,
    bannedReason: 'Seed data: posted spam comments during testing.',
  },
  { email: 'mfa.user@gallery.test', firstName: 'Milo', lastName: 'Fenwick', role: 'USER', sellerStatus: 'none', isMfaEnabled: true },
];

interface ArtworkSeed {
  artistEmail: string;
  title: string;
  description: string;
  imageSeed: string;
}

const ARTWORK_SEEDS: ArtworkSeed[] = [
  { artistEmail: 'ava.artist@gallery.test', title: 'Dawn Over the Marsh', description: 'Oil on canvas study of first light breaking over wetlands, painted en plein air across three mornings.', imageSeed: 'ava-dawn-marsh' },
  { artistEmail: 'ava.artist@gallery.test', title: 'Quiet Harbor', description: 'A muted palette study of fishing boats at rest, exploring reflection and stillness in cool blues.', imageSeed: 'ava-quiet-harbor' },
  { artistEmail: 'ava.artist@gallery.test', title: 'Fields in November', description: 'Impressionist rendering of harvested fields under a low autumn sun.', imageSeed: 'ava-fields-november' },
  { artistEmail: 'ava.artist@gallery.test', title: 'Coastal Cliffs at Dusk', description: 'Layered gouache capturing the last warm light hitting weathered cliffside rock.', imageSeed: 'ava-coastal-cliffs' },
  { artistEmail: 'liam.artist@gallery.test', title: 'Urban Geometry No. 4', description: 'Acrylic exploration of city architecture reduced to interlocking planes of color.', imageSeed: 'liam-urban-geometry-4' },
  { artistEmail: 'liam.artist@gallery.test', title: 'Night Market', description: 'A dense, lantern-lit street scene painted from memory after a trip through Southeast Asia.', imageSeed: 'liam-night-market' },
  { artistEmail: 'liam.artist@gallery.test', title: 'Concrete and Light', description: 'Brutalist architecture study focused on how midday sun carves shadow across raw concrete.', imageSeed: 'liam-concrete-light' },
  { artistEmail: 'maya.artist@gallery.test', title: 'Portrait in Ochre', description: 'A warm, textured portrait built up in thin ochre and burnt sienna glazes.', imageSeed: 'maya-portrait-ochre' },
  { artistEmail: 'maya.artist@gallery.test', title: 'Still Life with Citrus', description: 'Classical still life arrangement rendered with a modern, high-contrast palette.', imageSeed: 'maya-still-life-citrus' },
  { artistEmail: 'maya.artist@gallery.test', title: 'The Reader', description: 'An intimate study of light falling across a figure absorbed in a book.', imageSeed: 'maya-the-reader' },
  { artistEmail: 'maya.artist@gallery.test', title: 'Self Portrait, Winter', description: 'A restrained charcoal-and-oil self portrait completed over a single winter week.', imageSeed: 'maya-self-portrait-winter' },
  { artistEmail: 'noah.artist@gallery.test', title: 'Abstract Composition VII', description: 'Large-format abstract piece built from layered pours and palette-knife texture.', imageSeed: 'noah-abstract-vii' },
  { artistEmail: 'noah.artist@gallery.test', title: 'Fracture', description: 'Mixed media on panel exploring tension between hard geometric lines and organic color bleed.', imageSeed: 'noah-fracture' },
  { artistEmail: 'noah.artist@gallery.test', title: 'Signal Noise', description: 'A study in controlled chaos: spray, ink, and acrylic layered to mimic static.', imageSeed: 'noah-signal-noise' },
  { artistEmail: 'zoe.artist@gallery.test', title: 'Mountain Pass', description: 'A sweeping watercolor of a high alpine pass, painted from a week-long trekking trip.', imageSeed: 'zoe-mountain-pass' },
  { artistEmail: 'zoe.artist@gallery.test', title: 'Forest Floor', description: 'Close study of moss, fern, and dappled light on a forest floor after rain.', imageSeed: 'zoe-forest-floor' },
  { artistEmail: 'zoe.artist@gallery.test', title: 'Tidepool Study', description: 'Detailed gouache rendering of color and texture found in a single tidepool.', imageSeed: 'zoe-tidepool-study' },
  { artistEmail: 'zoe.artist@gallery.test', title: 'Winter Orchard', description: 'A bare orchard under fresh snow, painted with a deliberately restrained palette.', imageSeed: 'zoe-winter-orchard' },
];

const COMMENT_POOL = [
  'The light in this piece is incredible.',
  'I love the texture work here, must be stunning in person.',
  'This is going straight to my wishlist.',
  'The color palette is so calming.',
  'How long did this one take you?',
  'Would you consider doing a print run of this?',
  'The composition really draws the eye in.',
  'This reminds me of early Hopper, in the best way.',
  'Gorgeous brushwork on the edges.',
  'I keep coming back to look at this one.',
  'The contrast here is doing a lot of work, love it.',
  'Would love to see a larger version of this.',
];

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Copy backend/.env.example to backend/.env first.');
  }
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    throw new Error('Refusing to seed a database with NODE_ENV=production. Pass --force to override.');
  }

  await mongoose.connect(uri);
  console.log(`Connected to ${uri}`);

  const UserModel = mongoose.model(UserSchemaClass.name, UserMongooseSchema);
  const ArtworkModel = mongoose.model(ArtworkSchemaClass.name, ArtworkMongooseSchema);
  const ReactionModel = mongoose.model(ReactionSchemaClass.name, ReactionMongooseSchema);
  const CommentModel = mongoose.model(CommentSchemaClass.name, CommentMongooseSchema);

  console.log('Clearing users, artworks, reactions, and comments collections...');
  await Promise.all([
    UserModel.deleteMany({}),
    ArtworkModel.deleteMany({}),
    ReactionModel.deleteMany({}),
    CommentModel.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);
  let mfaSecret = '';

  const userDocs = await Promise.all(
    USER_SEEDS.map(async (seed) => {
      const doc: Record<string, unknown> = {
        email: seed.email,
        passwordHash,
        firstName: seed.firstName,
        lastName: seed.lastName,
        role: seed.role,
        sellerStatus: seed.sellerStatus,
        isBanned: seed.isBanned ?? false,
        bannedReason: seed.bannedReason,
      };
      if (seed.isMfaEnabled) {
        mfaSecret = authenticator.generateSecret();
        doc.isMfaEnabled = true;
        doc.mfaSecret = mfaSecret;
      }
      return UserModel.create(doc);
    }),
  );
  console.log(`Created ${userDocs.length} users.`);

  const userByEmail = new Map(USER_SEEDS.map((seed, i) => [seed.email, userDocs[i]]));
  const allUserIds = userDocs.map((u) => u._id);

  const artworkDocs = await Promise.all(
    ARTWORK_SEEDS.map((seed) => {
      const artist = userByEmail.get(seed.artistEmail);
      if (!artist) throw new Error(`Unknown artist email in artwork seed: ${seed.artistEmail}`);
      return ArtworkModel.create({
        title: seed.title,
        description: seed.description,
        imageUrl: `https://picsum.photos/seed/${seed.imageSeed}/900/700`,
        imagePublicId: `seed/${seed.imageSeed}`,
        painterId: artist._id,
      });
    }),
  );
  console.log(`Created ${artworkDocs.length} artworks.`);

  const reactionRows: { artworkId: mongoose.Types.ObjectId; userId: mongoose.Types.ObjectId; emoji: string }[] = [];
  for (const artwork of artworkDocs) {
    const reactorCount = 2 + Math.floor(Math.random() * (allUserIds.length - 2));
    const reactors = sample(allUserIds, reactorCount);
    for (const userId of reactors) {
      reactionRows.push({ artworkId: artwork._id, userId, emoji: pick(ALLOWED_EMOJIS) });
    }
  }
  await ReactionModel.insertMany(reactionRows);
  console.log(`Created ${reactionRows.length} reactions.`);

  const commentRows: { artworkId: mongoose.Types.ObjectId; authorId: mongoose.Types.ObjectId; text: string }[] = [];
  for (const artwork of artworkDocs) {
    const commentCount = 1 + Math.floor(Math.random() * 4);
    const commenters = sample(allUserIds, commentCount);
    for (const authorId of commenters) {
      commentRows.push({ artworkId: artwork._id, authorId, text: pick(COMMENT_POOL) });
    }
  }
  await CommentModel.insertMany(commentRows);
  console.log(`Created ${commentRows.length} comments.`);

  console.log('\nSeed complete. All accounts use the password: ' + SEED_PASSWORD);
  console.log('\nAccounts:');
  for (const seed of USER_SEEDS) {
    const tags = [
      seed.role,
      seed.sellerStatus !== 'none' ? `seller:${seed.sellerStatus}` : null,
      seed.isBanned ? 'BANNED' : null,
      seed.isMfaEnabled ? 'MFA' : null,
    ].filter(Boolean);
    console.log(`  ${seed.email.padEnd(28)} ${tags.join(', ')}`);
  }
  if (mfaSecret) {
    console.log(`\nMFA test account secret (mfa.user@gallery.test): ${mfaSecret}`);
    console.log('Add it to an authenticator app, or generate a token with otplib\'s authenticator.generate(secret).');
  }
}

main()
  .then(() => mongoose.disconnect())
  .then(() => {
    console.log('\nDisconnected. Done.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    return mongoose.disconnect().finally(() => process.exit(1));
  });
