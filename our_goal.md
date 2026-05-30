Enhance 3D Protein Structure Viewer in cBioPortal using AlphaFold Data

Background
cBioPortal currently integrates a 3D protein structure viewer that maps cancer mutations onto protein models using sequence alignments against experimentally-determined structures (e.g., PDB) via the G2S service. However, this viewer is not fully functional today, and coverage is limited to proteins with available PDB entries. ([G2S])

Meanwhile, the AlphaFold Protein Structure Database provides predicted 3D structures for nearly all human proteins with high accuracy, dramatically increasing structural coverage far beyond experimentally solved structures. ([AlphaFold])

Integrating AlphaFold data into the cBioPortal 3D viewer would significantly improve mutation visualization and interpretation by enabling structure views for proteins currently missing PDB coverage.

Goal
Enable a fully functional and enriched 3D protein structure viewer in cBioPortal that:

Retrieves and displays AlphaFold predicted models for human proteins (in addition to PDB structures).
Maps cancer mutations, allele annotations, and variant features onto these structures.
Update the current UI for users to explore both PDB and AlphaFold structures in the portal.
(Optional) Ensures performance, caching, and appropriate model confidence display, including pLDDT/PAE metrics from AlphaFold.
Approach
1. Backend Enhancements in G2S
Add support for fetching or caching AlphaFold model files (e.g., mmCIF/PDB or API retrieval) for human proteins.
Store necessary metadata (UniProt accessions → AlphaFold models) in the portal database or external cache.
Extend or refactor existing alignment tables to reference both PDB and AlphaFold models.
Implement REST API endpoints to serve model coordinates and corresponding mutation mappings to the frontend.
2. Structure Alignment & Mapping Pipeline in G2S
Build/update an automated pipeline that:

Queries the AlphaFold database for available predictions for a given gene/protein.
Ensures reliable mappings between gene identifiers, protein sequences, and structure models.
Precomputes residue alignment ranges (sequence ↔ structure coordinates).
Handle multiple isoforms and alternative transcripts where applicable.

3. Frontend (React / TypeScript) in cBioPortal
Fix and update the current protein viewer (e.g., using NGLViewer, Mol*), supporting:
Loading both experimental (PDB) and predicted (AlphaFold) structures.
Color-coding regions by mutation density or confidence metrics (e.g., pLDDT per residue).
Displaying mutation “pins”, labels, and interactive exploration tools.
Handle error states gracefully (e.g., missing model, low confidence regions).
4. UX & Visualization Considerations
Display AlphaFold confidence metrics (e.g., pLDDT, PAE) visually (e.g., color gradients).
Add legends/info panels that explain structure source (experimental vs predicted).
Cache frequently retrieved models in the browser or CDN for performance.
Need Skills
Bioinformatics / Structural Biology: Understanding of protein structures, sequence alignment to structural coordinates, ability to interpret AlphaFold confidence metrics.
Backend Development (Java, Spring): Extend APIs and storage layers to serve structural data efficiently.
Frontend (React, TypeScript, WebGL): Integrate and customize interactive 3D viewer components.
Familiarity with protein data formats (PDB/mmCIF) and common structural viewers.
Resources
cBioPortal Frontend and Backend repos (Java, Spring Boot, React).
AlphaFold Protein Structure Database API and data download resources. ([AlphaFold])
g2s sequence alignment service currently used by the portal.
Existing 3D viewer integration / mutation mapping code in cBioPortal.