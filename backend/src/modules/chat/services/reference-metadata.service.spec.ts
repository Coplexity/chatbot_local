import { ReferenceMetadataService } from "./reference-metadata.service";

describe("referenceMetadataService", () => {
  it("resolves chunk ids through sections, versions, and guidelines", async () => {
    const dataSource = {
      query: jest.fn()
        .mockResolvedValueOnce([
          {
            chunk_id: 123,
            section_id: 30,
            version_id: 7,
          },
        ])
        .mockResolvedValueOnce([
          {
            section_id: 30,
            heading: "Leaf",
            section_path: "1.2",
            page_start: 12,
            level: 2,
            parent_id: 20,
            version_id: 7,
          },
          {
            section_id: 20,
            heading: "Root",
            section_path: "1",
            page_start: 10,
            level: 1,
            parent_id: null,
            version_id: 7,
          },
        ])
        .mockResolvedValueOnce([
          {
            version_id: 7,
            version_label: "v1",
            guideline_id: 9,
            guideline_title: "Guideline title",
            document_id: 55,
          },
        ]),
    };

    const service = new ReferenceMetadataService(dataSource as any);

    await expect(service.getByChunkIds([123])).resolves.toEqual([
      {
        chunkId: 123,
        guidelineId: 9,
        guidelineTitle: "Guideline title",
        versionId: 7,
        versionLabel: "v1",
        sectionId: 30,
        headings: [
          {
            sectionId: 20,
            heading: "Root",
            sectionPath: "1",
            startPage: 10,
            level: 1,
          },
          {
            sectionId: 30,
            heading: "Leaf",
            sectionPath: "1.2",
            startPage: 12,
            level: 2,
          },
        ],
        deepestHeading: "Leaf",
        sectionPath: "1.2",
        startPage: 12,
        documentId: 55,
        pdfPage: 12,
      },
    ]);
  });
});
