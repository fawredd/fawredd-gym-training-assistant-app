"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface ExerciseCatalogItem {
  id: string;
  nombreNormalizado: string;
  grupoMuscular: string;
  actividad: string;
  createdAt: string;
}

interface ExerciseCatalogManagerProps {
  initialItems: ExerciseCatalogItem[];
}

const defaultFormState = {
  nombreNormalizado: "",
  grupoMuscular: "",
  actividad: "musculacion",
};

export default function ExerciseCatalogManager({
  initialItems,
}: ExerciseCatalogManagerProps) {
  const [items, setItems] = useState<ExerciseCatalogItem[]>(initialItems);
  const [form, setForm] = useState(defaultFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState(defaultFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const refresh = async () => {
    const response = await fetch("/api/exercise-catalog");
    if (response.ok) {
      setItems(await response.json());
    }
  };

  const handleFormChange = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleEditChange = (field: keyof typeof editValues, value: string) => {
    setEditValues((current) => ({ ...current, [field]: value }));
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/exercise-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const text = await response.text();
        setErrorMessage(text || "No se pudo crear el ejercicio");
        return;
      }

      setForm(defaultFormState);
      await refresh();
    } catch (error) {
      console.error(error);
      setErrorMessage("No se pudo crear el ejercicio");
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (item: ExerciseCatalogItem) => {
    setEditingId(item.id);
    setEditValues({
      nombreNormalizado: item.nombreNormalizado,
      grupoMuscular: item.grupoMuscular,
      actividad: item.actividad,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValues(defaultFormState);
    setErrorMessage(null);
  };

  const handleUpdate = async (itemId: string) => {
    setErrorMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/exercise-catalog/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editValues),
      });

      if (!response.ok) {
        const text = await response.text();
        setErrorMessage(text || "No se pudo actualizar el ejercicio");
        return;
      }

      cancelEditing();
      await refresh();
    } catch (error) {
      console.error(error);
      setErrorMessage("No se pudo actualizar el ejercicio");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    const confirmed = confirm("¿Eliminar este ejercicio del catálogo?");
    if (!confirmed) return;

    setErrorMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/exercise-catalog/${itemId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const text = await response.text();
        setErrorMessage(text || "No se pudo eliminar el ejercicio");
        return;
      }
      await refresh();
    } catch (error) {
      console.error(error);
      setErrorMessage("No se pudo eliminar el ejercicio");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="bg-card border border-border">
        <CardContent className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Agregar nuevo ejercicio</h2>
            <p className="text-sm text-muted-foreground">
              Define un ejercicio con su nombre normalizado, grupo muscular y
              tipo de actividad.
            </p>
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nombreNormalizado">Nombre normalizado</Label>
              <Input
                id="nombreNormalizado"
                value={form.nombreNormalizado}
                onChange={(event) =>
                  handleFormChange("nombreNormalizado", event.target.value)
                }
                placeholder="press banca plano"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grupoMuscular">Grupo muscular</Label>
              <Input
                id="grupoMuscular"
                value={form.grupoMuscular}
                onChange={(event) =>
                  handleFormChange("grupoMuscular", event.target.value)
                }
                placeholder="Pecho"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="actividad">Actividad</Label>
              <Input
                id="actividad"
                value={form.actividad}
                onChange={(event) =>
                  handleFormChange("actividad", event.target.value)
                }
                placeholder="musculacion"
                required
              />
            </div>

            <div className="sm:col-span-3">
              <Button type="submit" disabled={isSaving} className="w-full">
                {isSaving ? "Guardando..." : "Agregar ejercicio"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Catálogo de ejercicios</h2>
            <p className="text-sm text-muted-foreground">
              Administra los ejercicios normalizados usados en el historial de
              entrenamiento.
            </p>
          </div>
          <Button type="button" onClick={refresh} disabled={isSaving}>
            Actualizar lista
          </Button>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border bg-background shadow-sm">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Grupo muscular</th>
                <th className="px-4 py-3">Actividad</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4 align-top">
                    {editingId === item.id ? (
                      <Input
                        value={editValues.nombreNormalizado}
                        onChange={(event) =>
                          handleEditChange(
                            "nombreNormalizado",
                            event.target.value,
                          )
                        }
                        required
                      />
                    ) : (
                      item.nombreNormalizado
                    )}
                  </td>
                  <td className="px-4 py-4 align-top">
                    {editingId === item.id ? (
                      <Input
                        value={editValues.grupoMuscular}
                        onChange={(event) =>
                          handleEditChange("grupoMuscular", event.target.value)
                        }
                        required
                      />
                    ) : (
                      item.grupoMuscular
                    )}
                  </td>
                  <td className="px-4 py-4 align-top">
                    {editingId === item.id ? (
                      <Input
                        value={editValues.actividad}
                        onChange={(event) =>
                          handleEditChange("actividad", event.target.value)
                        }
                        required
                      />
                    ) : (
                      item.actividad
                    )}
                  </td>
                  <td className="px-4 py-4 align-top space-x-2">
                    {editingId === item.id ? (
                      <>
                        <Button
                          type="button"
                          onClick={() => handleUpdate(item.id)}
                          disabled={isSaving}
                          size="sm"
                        >
                          Guardar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={cancelEditing}
                          disabled={isSaving}
                          size="sm"
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          onClick={() => startEditing(item)}
                          size="sm"
                        >
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => handleDelete(item.id)}
                          size="sm"
                        >
                          Eliminar
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
