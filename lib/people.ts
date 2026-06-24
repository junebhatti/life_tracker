// Person model: contacts/relationships, populated manually or auto-created
// when an Obsidian note names someone in its `person`/`people` frontmatter.

export type Person = {
  id: string;
  name: string;
  createdAt: string;
};

export type NewPersonInput = {
  name: string;
};
