import "@material/mwc-button/mwc-button";
import { mdiDeleteOutline, mdiPlus } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import "../../../../components/ha-alert";
import "../../../../components/ha-area-picker";
import "../../../../components/ha-dialog";
import "../../../../components/ha-textfield";
import type { HaTextField } from "../../../../components/ha-textfield";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { EntityAliasesDialogParams } from "./show-dialog-entity-aliases";

@customElement("dialog-entity-aliases")
class DialogEntityAliases extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _error?: string;

  @state() private _params?: EntityAliasesDialogParams;

  @state() private _aliases!: string[];

  @state() private _submitting = false;

  public async showDialog(params: EntityAliasesDialogParams): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._aliases =
      this._params.entity.aliases?.length > 0
        ? [...this._params.entity.aliases].sort()
        : [""];
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._error = "";
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }

    const entityId = this._params.entity.entity_id;
    const stateObj = entityId ? this.hass.states[entityId] : undefined;

    const name = (stateObj && computeStateName(stateObj)) || entityId;

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${this.hass.localize(
          "ui.dialogs.entity_registry.editor.aliases.heading",
          { name }
        )}
      >
        <div>
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert> `
            : ""}
          <div class="form">
            ${this._aliases.map(
              (alias, index) => html`
                <div class="layout horizontal center-center row">
                  <ha-textfield
                    dialogInitialFocus=${index}
                    .index=${index}
                    class="flex-auto"
                    .label=${this.hass!.localize(
                      "ui.dialogs.entity_registry.editor.aliases.input_label",
                      { number: index + 1 }
                    )}
                    .value=${alias}
                    ?data-last=${index === this._aliases.length - 1}
                    @input=${this._editAlias}
                    @keydown=${this._keyDownAlias}
                  ></ha-textfield>
                  <ha-icon-button
                    .index=${index}
                    slot="navigationIcon"
                    label=${this.hass!.localize(
                      "ui.dialogs.entity_registry.editor.aliases.remove_alias",
                      { number: index + 1 }
                    )}
                    @click=${this._removeAlias}
                    .path=${mdiDeleteOutline}
                  ></ha-icon-button>
                </div>
              `
            )}
            <div class="layout horizontal center-center">
              <mwc-button @click=${this._addAlias}>
                ${this.hass!.localize(
                  "ui.dialogs.entity_registry.editor.aliases.add_alias"
                )}
                <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
              </mwc-button>
            </div>
          </div>
        </div>
        <mwc-button
          slot="secondaryAction"
          @click=${this.closeDialog}
          .disabled=${this._submitting}
        >
          ${this.hass.localize("ui.common.cancel")}
        </mwc-button>
        <mwc-button
          slot="primaryAction"
          @click=${this._updateEntry}
          .disabled=${this._submitting}
        >
          ${this.hass.localize(
            "ui.dialogs.entity_registry.editor.aliases.save"
          )}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private async _addAlias() {
    this._aliases = [...this._aliases, ""];
    await this.updateComplete;
    const field = this.shadowRoot?.querySelector(`ha-textfield[data-last]`) as
      | HaTextField
      | undefined;
    field?.focus();
  }

  private async _editAlias(ev: Event) {
    const index = (ev.target as any).index;
    this._aliases[index] = (ev.target as any).value;
  }

  private async _keyDownAlias(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      ev.stopPropagation();
      this._addAlias();
    }
  }

  private async _removeAlias(ev: Event) {
    const index = (ev.target as any).index;
    const aliases = [...this._aliases];
    aliases.splice(index, 1);
    this._aliases = aliases;
  }

  private async _updateEntry(): Promise<void> {
    this._submitting = true;
    const noEmptyAliases = this._aliases
      .map((alias) => alias.trim())
      .filter((alias) => alias);

    try {
      await this._params!.updateEntry({
        aliases: noEmptyAliases,
      });
      this.closeDialog();
    } catch (err: any) {
      this._error =
        err.message ||
        this.hass.localize(
          "ui.dialogs.entity_registry.editor.aliases.unknown_error"
        );
    } finally {
      this._submitting = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        .row {
          margin-bottom: 8px;
        }
        ha-textfield {
          display: block;
        }
        ha-icon-button {
          display: block;
        }
        mwc-button {
          margin-left: 8px;
        }
        #alias_input {
          margin-top: 8px;
        }
        .alias {
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          margin-top: 4px;
          --mdc-icon-button-size: 24px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-entity-aliases": DialogEntityAliases;
  }
}
