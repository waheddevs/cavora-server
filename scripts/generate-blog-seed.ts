import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

interface FrontendPost {
  author: string;
  authorImg: string;
  category: string;
  comments: number;
  date: string;
  excerpt: string;
  id: number;
  img: string;
  title: string;
}

interface ArticleBlock {
  author?: string;
  items?: string[];
  text?: string;
  type: 'paragraph' | 'heading' | 'quote' | 'list';
}

interface BlogModule {
  posts: FrontendPost[];
}

interface BlogDetailsModule {
  getArticleBody(post: FrontendPost): ArticleBlock[];
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function generateBlogSeed(): Promise<void> {
  const frontendRoot = path.resolve(process.argv[2] ?? path.join('..', 'cavora-react'));
  const blogSource = path.join(frontendRoot, 'src', 'app', 'data', 'blogData.ts');
  const detailsSource = path.join(frontendRoot, 'src', 'app', 'data', 'blogDetailsData.ts');
  const output = path.resolve('src', 'data', 'blog.seed.json');

  const blogModule = (await import(pathToFileURL(blogSource).href)) as BlogModule;
  const detailsModule = (await import(pathToFileURL(detailsSource).href)) as BlogDetailsModule;

  const posts = blogModule.posts.map((post) => ({
    sourceId: post.id,
    slug: slugify(post.title),
    title: post.title,
    excerpt: post.excerpt,
    body: detailsModule.getArticleBody(post),
    category: post.category,
    imageUrl: post.img,
    authorName: post.author,
    authorImageUrl: post.authorImg,
    status: 'PUBLISHED',
    publishedAt: new Date(post.date).toISOString(),
    commentCount: post.comments,
  }));

  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify({ posts }, null, 2)}\n`, 'utf8');
  console.log(`Generated ${posts.length} blog posts at ${output}`);
}

void generateBlogSeed().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
