import { ArrowUpRight, FileText } from "lucide-react";

// Laboratory verification links supplied by the client; no test results are inferred here.
const reports = [
  ["GLOW PRO 70 mg", "243716-GLOW_PRO_70mg_42L7GT3FK82U"],
  ["WOLVERINE PRO 40 mg", "243715-WOLVERINE_PRO_40mg_G93HDGPEHWF5"],
  ["MT2 PRO 20 mg", "243719-MT2_PRO_20mg_2DI2HJG4FXDU"],
  ["MOTS-C PRO 20 mg", "243720-MOTSC_PRO_YMUNW5JZVXF1"],
  ["BPC157 PRO 10 mg", "243721-BPC157_PRO_10mg_D193LUSK8Y"],
  ["GHK-CU PRO 100 mg", "243718-GHKCU_PRO_100mg_XQJS8H4LJR9M"],
  ["TIRZEP PRO 60 mg", "243714-TIRZEP_PRO_60mg_9EZTTY6IFAPV"],
  ["TIRZEP PRO 40 mg", "243713-TIRZEP_PRO_40mg_YLH2S742J7UA"],
  ["KLOW PRO 80 mg", "243717-KLOW_PRO_80mg_ETFI755LP1EB"],
] as const;

export function CertificationReports() {
  return <section id="certification-reports" className="cert-reports" aria-labelledby="certification-reports-title">
    <div className="cert-reports-inner">
      <p className="cert-reports-eyebrow">BATCH DOCUMENTATION</p>
      <h2 id="certification-reports-title">Certificates of Analysis</h2>
      <p className="cert-reports-intro">Open the product’s report on Janoshik to review its results. Match the report and batch details to your product.</p>
      <ul>{reports.map(([name, report]) => <li key={report}>
        <a href={`https://verify.janoshik.com/tests/${report}`} target="_blank" rel="noopener noreferrer">
          <FileText aria-hidden="true" /><span><strong>{name}</strong><span>Janoshik · Report {report.split("-")[0]}</span></span><ArrowUpRight aria-hidden="true" />
        </a>
      </li>)}</ul>
    </div>
  </section>;
}
