import { adminSupabase } from "../../lib/supabase/admin";
import { AppError } from "../../types";
import type { Category } from "../../types";
import type { CreateCategoryInput, UpdateCategoryInput } from "./schema";

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await adminSupabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new AppError(500, "DB_ERROR", "Failed to fetch categories");
  return (data as Category[]) ?? [];
}

export async function getCategoryBySlug(slug: string): Promise<Category> {
  const { data, error } = await adminSupabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !data)
    throw new AppError(404, "CATEGORY_NOT_FOUND", "Category not found");
  return data as Category;
}

// Admin

export async function listAllCategories(): Promise<Category[]> {
  const { data, error } = await adminSupabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw new AppError(500, "DB_ERROR", "Failed to fetch categories");
  return (data as Category[]) ?? [];
}

export async function createCategory(
  input: CreateCategoryInput,
): Promise<Category> {
  const isActive = input.is_active ?? true;
  const showInNavbar = input.show_in_navbar ?? false;

  if (isActive && showInNavbar) {
    const { count, error: countError } = await adminSupabase
      .from("categories")
      .select("*", { count: "exact", head: true })
      .eq("show_in_navbar", true)
      .eq("is_active", true);

    if (countError) {
      throw new AppError(500, "DB_ERROR", "Failed to check navbar category limit");
    }
    if ((count ?? 0) >= 5) {
      throw new AppError(400, "NAVBAR_LIMIT_REACHED", "Maximum of 5 categories can be shown in the navbar");
    }
  }

  const { data, error } = await adminSupabase
    .from("categories")
    .insert(input)
    .select()
    .single();

  if (error) {
    if (error.code === "23505")
      throw new AppError(409, "DUPLICATE_SLUG", "Category slug already exists");
    throw new AppError(500, "DB_ERROR", "Failed to create category");
  }
  return data as Category;
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<Category> {
  // Fetch current state to see if it will become active + show_in_navbar
  const current = await getCategoryById(id);
  const willBeActive = input.is_active ?? current.is_active;
  const willBeInNavbar = input.show_in_navbar ?? current.show_in_navbar;

  if (willBeActive && willBeInNavbar) {
    const { count, error: countError } = await adminSupabase
      .from("categories")
      .select("*", { count: "exact", head: true })
      .eq("show_in_navbar", true)
      .eq("is_active", true)
      .neq("id", id);

    if (countError) {
      throw new AppError(500, "DB_ERROR", "Failed to check navbar category limit");
    }
    if ((count ?? 0) >= 5) {
      throw new AppError(400, "NAVBAR_LIMIT_REACHED", "Maximum of 5 categories can be shown in the navbar");
    }
  }

  const { data, error } = await adminSupabase
    .from("categories")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error || !data)
    throw new AppError(404, "CATEGORY_NOT_FOUND", "Category not found");
  return data as Category;
}

/**
 * getCategoryById — Fetch a single category by primary key.
 *
 * Used by adminDeleteCategory to retrieve the slug BEFORE the row is
 * soft-deleted so the correct cache bucket can be evicted.
 */
export async function getCategoryById(id: string): Promise<Category> {
  const { data, error } = await adminSupabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data)
    throw new AppError(404, "CATEGORY_NOT_FOUND", "Category not found");
  return data as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  // Soft-delete by deactivating
  const { error } = await adminSupabase
    .from("categories")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw new AppError(500, "DB_ERROR", "Failed to delete category");
}
