import fs from "fs";
import path from "path";
import https from "https";

const papers = [
  { file: "acl-meta-analysis-huang-2022.pdf", doi: "10.1097/MD.0000000000029263" },
  { file: "hip-fai-combined-tests-palsson-2020.pdf", doi: "10.1016/j.math.2014.11.006" }, // Guessed DOI for Palsson
  { file: "hop-tests-critical-review-davies-2020.pdf", doi: "10.1007/s40279-019-01221-7" },
  { file: "shoulder-impingement-calis-2000.pdf", doi: "10.1136/ard.59.1.24" },
  { file: "shoulder-systematic-review-gismervik-2017.pdf", doi: "10.1186/s12891-017-1400-0" },
  { file: "spurling-cervical-review-rubinstein-2007.pdf", doi: "10.1007/s00586-006-0224-4" },
  { file: "spurling-radiculopathy-thoomes-2026.pdf", doi: "10.1097/PHM.0000000000002707" },
];

const targetDir = path.join(process.cwd(), "public", "clinical-tests", "papers");

function fetchPdfUrlFromUnpaywall(doi: string): Promise<string | null> {
  return new Promise((resolve) => {
    const url = `https://api.unpaywall.org/v2/${doi}?email=rafael.minato@usp.br`;
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(data);
              if (json.best_oa_location && json.best_oa_location.url_for_pdf) {
                resolve(json.best_oa_location.url_for_pdf);
              } else {
                resolve(null);
              }
            } catch {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
      })
      .on("error", () => resolve(null));
  });
}

function downloadPdf(url: string, dest: string): Promise<boolean> {
  return new Promise((resolve) => {
    https
      .get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          // follow redirect
          downloadPdf(res.headers.location as string, dest).then(resolve);
          return;
        }
        if (res.statusCode !== 200) {
          resolve(false);
          return;
        }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve(true);
        });
      })
      .on("error", () => {
        fs.unlink(dest, () => {});
        resolve(false);
      });
  });
}

async function main() {
  console.log("Checking Open Access availability...");
  for (const paper of papers) {
    console.log(`\nChecking ${paper.doi} for ${paper.file}...`);
    const pdfUrl = await fetchPdfUrlFromUnpaywall(paper.doi);
    if (pdfUrl) {
      console.log(`✅ Found OA PDF: ${pdfUrl}`);
      const success = await downloadPdf(pdfUrl, path.join(targetDir, paper.file));
      console.log(success ? `Downloaded!` : `Failed to download PDF.`);
    } else {
      console.log(`❌ No OA PDF available.`);
    }
  }
}

main().catch(console.error);
