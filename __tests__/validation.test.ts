import {
  boardSchema,
  boardUpdateSchema,
  cardPatchSchema,
  emailSchema,
  registerSchema,
} from '@/lib/validation';

describe('emailSchema', () => {
  it('trims and lowercases valid addresses', () => {
    expect(emailSchema.parse('  Ada@Example.COM ')).toBe('ada@example.com');
  });

  it('rejects invalid addresses', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
  });
});

describe('registerSchema', () => {
  const valid = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    password: 'correct-horse',
    confirmPassword: 'correct-horse',
  };

  it('accepts matching passwords', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('reports mismatched passwords on the confirmation field', () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: 'different' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['confirmPassword']);
    }
  });

  it('requires at least eight password characters', () => {
    const result = registerSchema.safeParse({
      ...valid,
      password: 'short',
      confirmPassword: 'short',
    });
    expect(result.success).toBe(false);
  });
});

describe('boardSchema', () => {
  it('trims the title and applies defaults', () => {
    const result = boardSchema.parse({
      title: '  Product launch  ',
      templateId: 'basic-kanban',
    });

    expect(result).toEqual({
      title: 'Product launch',
      description: '',
      color: 'lavender',
      templateId: 'basic-kanban',
    });
  });

  it('rejects an empty title', () => {
    expect(boardSchema.safeParse({ title: '   ', templateId: 'blank' }).success).toBe(false);
  });
});

describe('boardUpdateSchema', () => {
  it('defaults an empty description', () => {
    expect(boardUpdateSchema.parse({ title: 'Roadmap', color: 'sage' })).toEqual({
      title: 'Roadmap',
      description: '',
      color: 'sage',
    });
  });

  it('rejects unknown colors', () => {
    expect(boardUpdateSchema.safeParse({ title: 'Roadmap', color: 'neon' }).success).toBe(
      false
    );
  });
});

describe('cardPatchSchema', () => {
  it('accepts partial patches with nullable fields', () => {
    const result = cardPatchSchema.parse({
      title: '  Ship it  ',
      dueDate: null,
      label: null,
      assigneeId: null,
    });

    expect(result.title).toBe('Ship it');
    expect(result.dueDate).toBeNull();
    expect(result.label).toBeNull();
    expect(result.assigneeId).toBeNull();
  });

  it('rejects empty patches', () => {
    expect(cardPatchSchema.safeParse({}).success).toBe(false);
  });

  it('rejects an invalid assignee id', () => {
    expect(cardPatchSchema.safeParse({ assigneeId: 'not-a-uuid' }).success).toBe(false);
  });

  it('rejects impossible calendar dates', () => {
    expect(cardPatchSchema.safeParse({ dueDate: '2026-02-30' }).success).toBe(false);
    expect(cardPatchSchema.safeParse({ dueDate: '26-02-2026' }).success).toBe(false);
    expect(cardPatchSchema.safeParse({ dueDate: '2028-02-29' }).success).toBe(true);
  });
});
