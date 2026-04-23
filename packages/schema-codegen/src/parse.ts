import { Node, Project, SyntaxKind, type TypeAliasDeclaration } from 'ts-morph';

export interface EnumModel {
  kind: 'enum';
  name: string;
  values: string[];
}

export interface BrandedIdModel {
  kind: 'brandedId';
  name: string; // e.g. "WorkspaceId"
  prefix: string; // e.g. "ws"
}

export interface PropertyModel {
  name: string;
  tsType: string; // raw TS type text
  optional: boolean;
}

export interface RecordModel {
  kind: 'record';
  name: string;
  properties: PropertyModel[];
}

export interface AliasModel {
  kind: 'alias';
  name: string;
  tsType: string;
}

export type SchemaModel = EnumModel | BrandedIdModel | RecordModel | AliasModel;

export interface ParseResult {
  models: SchemaModel[];
}

const BRAND_REGEX = /^`([a-z]+)_\$\{string\}`$/;

export function parseSchema(schemaPath: string): ParseResult {
  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const source = project.addSourceFileAtPath(schemaPath);

  const models: SchemaModel[] = [];

  for (const decl of source.getTypeAliases()) {
    const model = classifyAlias(decl);
    if (model) models.push(model);
  }

  for (const decl of source.getInterfaces()) {
    const properties: PropertyModel[] = decl.getProperties().map((p) => ({
      name: p.getName(),
      tsType: p.getTypeNode()?.getText() ?? p.getType().getText(p),
      optional: p.hasQuestionToken(),
    }));
    models.push({ kind: 'record', name: decl.getName(), properties });
  }

  return { models };
}

function classifyAlias(decl: TypeAliasDeclaration): SchemaModel | null {
  const name = decl.getName();
  const typeNode = decl.getTypeNode();
  if (!typeNode) return null;

  // Branded ID: `${prefix}_${string}`
  if (Node.isTemplateLiteralTypeNode(typeNode)) {
    const head = typeNode.getHead().getText();
    const match = head.match(BRAND_REGEX) ?? head.match(/^`([a-z]+)_$/);
    if (match) {
      return { kind: 'brandedId', name, prefix: match[1]! };
    }
    // Fallback: inspect children
    const text = typeNode.getText();
    const literal = text.match(/`([a-z]+)_\$\{string\}`/);
    if (literal) return { kind: 'brandedId', name, prefix: literal[1]! };
  }

  // String enum: "a" | "b" | "c"
  if (Node.isUnionTypeNode(typeNode)) {
    const members = typeNode.getTypeNodes();
    const literals: string[] = [];
    let allStringLiterals = true;
    for (const m of members) {
      if (m.isKind(SyntaxKind.LiteralType)) {
        const lit = m.getLiteral();
        if (Node.isStringLiteral(lit)) {
          literals.push(lit.getLiteralValue());
          continue;
        }
      }
      allStringLiterals = false;
      break;
    }
    if (allStringLiterals && literals.length > 0) {
      return { kind: 'enum', name, values: literals };
    }
  }

  // Catch-all alias (e.g. Iso8601 = string) — we don't emit these but keep
  // the record in case we later want to type them stronger.
  return { kind: 'alias', name, tsType: typeNode.getText() };
}
