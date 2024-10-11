import axios from "axios";
import * as cheerio from "cheerio";

const baseUrl = "https://paulgraham.com/articles.html";
const selector = "body > table > tbody > tr > td:nth-child(3) > table:nth-child(6) > tbody a";

interface ArticleContent {
  title: string;
  publishDate: string | null;
  content: string;
}

async function getAllArticles(): Promise<ArticleContent[] | null> {
  const articles: ArticleContent[] = [];
  try {
    // Fetch the main page
    const mainResponse = await axios.get(baseUrl);
    const mainPage = cheerio.load(mainResponse.data);

    console.log(`links: ${mainPage(selector).length}`);
    const links = mainPage(selector)
      .map((i, el) => ({
        title: mainPage(el).text().trim(),
        href: `https://paulgraham.com/${mainPage(el).attr("href")?.trim()}`,
      }))
      .get();
    console.table(links);

    for (const link of links.slice(0, 1)) {
      const articleResponse = await axios.get(link.href);
      const $ = cheerio.load(articleResponse.data);

      // Parse the title
      // const title = $("title").text().trim();

      // Get all the text content
      const fullText = $('font[size="2"]').text().trim();
      // console.log(`fullText: ${fullText}`);
      // Find the first occurrence of a year (assuming years are between 1900 and 2099)
      const { date, articleText } = separateArticleTextFromDate(fullText);

      const sanitizedArticleText = articleText.replace(/\n/g, " ");

      articles.push({
        title: link.title,
        publishDate: date,
        content: sanitizedArticleText,
      });
    }

    return articles;
  } catch (error) {
    console.error("Error fetching or parsing the pages:", error);
    return null;
  }
}

// Usage
getAllArticles().then((article) => {
  console.log(JSON.stringify(article, null, 2));
});

function separateArticleTextFromDate(text: string): {
  date: string;
  articleText: string;
} {
  const dateYearRegex = /^(.+?\d{4})/;
  const match = text.match(dateYearRegex);
  // console.log(`did match: ${match}`);

  if (match) {
    const date = match[1];
    const articleText = text.slice(date.length).trim();

    return { date, articleText };
  } else {
    return { date: "", articleText: text };
  }
}

// Example usage
// const text = `September 2024At a YC event last week Brian Chesky gave a talk that everyone who
//   was there will remember.`;

// const result = separateTextByYear(text);
// console.log(result.date); // Output: "September 2024"
// console.log(result.articleText); // Output: "At a YC event last week Brian Chesky gave a talk that everyone who
// //          was there will remember."
