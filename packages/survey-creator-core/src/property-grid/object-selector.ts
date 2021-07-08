import {
  Base,
  SurveyModel,
  property,
  IActionBarItem,
  ListModel,
  propertyArray
} from "survey-core";
import { editorLocalization } from "../editorLocalization";
import { SurveyHelper } from "../survey-helper";

export class ObjectSelectorItem extends Base implements IActionBarItem {
  private textInLow: string;
  public id: string;
  constructor(
    id: number,
    public data: Base,
    public title: string,
    public level: number
  ) {
    super();
    this.id = "sv_item_selector_" + id.toString();
  }
  @property({ defaultValue: true }) visible: boolean;
  public hasText(filteredTextInLow: string): boolean {
    if (!filteredTextInLow) return true;
    if (!this.textInLow) {
      this.textInLow = this.title.toLocaleLowerCase();
    }
    return this.textInLow.indexOf(filteredTextInLow) > -1;
  }
}

export class ObjectSelector {
  private surveyValue: SurveyModel;
  private deepestLevel: number;
  private filteredTextInLow: string;
  private itemsValue: Array<ObjectSelectorItem>;
  constructor(
    survey: SurveyModel,
    private getObjectDisplayName: (
      obj: Base,
      reason: string,
      displayName: string
    ) => string = undefined
  ) {
    this.surveyValue = survey;
    this.rebuild();
  }
  public get survey() {
    return this.surveyValue;
  }
  public get items(): Array<ObjectSelectorItem> {
    return this.itemsValue;
  }
  public getItemByObj(obj: Base): IActionBarItem {
    var items = this.items;
    for (var i = 0; i < items.length; i++) {
      if (items[i].data === obj) return items[i];
    }
    return null;
  }
  public filterByText(filteredText: string) {
    this.filteredTextInLow = !!filteredText
      ? filteredText.toLocaleLowerCase()
      : "";
    this.updateItemsVisibility();
  }
  private rebuild() {
    var objs = [];
    this.deepestLevel = 0;
    var root = this.createItem(this.survey, null);
    objs.push(root);
    for (var i = 0; i < this.survey.pages.length; i++) {
      var page = this.survey.pages[i];
      var pageItem = this.createItem(page, root);
      objs.push(pageItem);
      this.buildElements(objs, this.getElements(page), pageItem);
    }
    this.itemsValue = objs;
  }
  private updateItemsVisibility() {
    for (var i = this.deepestLevel; i >= 0; i--) {
      this.updateItemsLevelVisibility(i);
    }
  }
  private updateItemsLevelVisibility(level: number) {
    for (var i = 0; i < this.items.length; i++) {
      var item = this.items[i];
      if (item.level !== level) continue;
      item.visible =
        this.hasVisibleChildren(i) || item.hasText(this.filteredTextInLow);
    }
  }
  private hasVisibleChildren(index: number): boolean {
    var level = this.items[index].level;
    for (var i = index + 1; i < this.items.length; i++) {
      if (this.items[i].level <= level) return false;
      if (this.items[i].visible) return true;
    }
    return false;
  }
  private getElements(element: any): Array<any> {
    return SurveyHelper.getElements(element);
  }
  private buildElements(
    objs: Array<any>,
    elements: Array<any>,
    parentItem: ObjectSelectorItem
  ) {
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      var item = this.createItem(el, parentItem);
      objs.push(item);
      this.buildElements(objs, this.getElements(el), item);
    }
  }
  private static uniqueId = 0;
  private createItem(obj: Base, parent: ObjectSelectorItem) {
    var item = new ObjectSelectorItem(
      ObjectSelector.uniqueId++,
      obj,
      this.getText(obj),
      parent != null ? parent.level + 1 : 0
    );
    if (item.level > this.deepestLevel) {
      this.deepestLevel = item.level;
    }
    return item;
  }
  private getText(obj: Base): string {
    var text = !!this.getObjectDisplayName
      ? this.getObjectDisplayName(obj, "property-grid", undefined)
      : SurveyHelper.getObjectName(obj, false);
    return text;
  }
}
export class ObjectSelectorModel extends Base {
  private selector: ObjectSelector;
  private listModelValue: ListModel;
  @property() filteredText: string;
  @property() isVisible: boolean;
  public onCreateItemCallback: (item: ObjectSelectorItem) => void;
  constructor(
    private getObjectDisplayName: (
      obj: Base,
      reason: string,
      displayName: string
    ) => string = undefined
  ) {
    super();
  }
  public get list(): ListModel {
    return this.listModelValue;
  }
  public show(
    survey: SurveyModel,
    selectedItem: Base,
    onClose: (obj: Base) => void
  ) {
    this.filteredText = "";
    this.selector = new ObjectSelector(survey, this.getObjectDisplayName);
    this.onItemsCreated();
    this.listModelValue = new ListModel(
      this.selector.items,
      (item: IActionBarItem) => {
        onClose(item.data);
      },
      true,
      this.selector.getItemByObj(selectedItem)
    );
    this.isVisible = true;
  }
  public get filteredTextPlaceholder(): string {
    return editorLocalization.getString(
      "ed.propertyGridFilteredTextPlaceholder"
    );
  }
  private onItemsCreated() {
    if (!this.onCreateItemCallback) return;
    var items = this.selector.items;
    for (var i = 0; i < items.length; i++) {
      this.onCreateItemCallback(items[i]);
    }
  }
  protected onPropertyValueChanged(name: string, oldValue: any, newValue: any) {
    super.onPropertyValueChanged(name, oldValue, newValue);
    if (name === "filteredText" && !!this.selector) {
      this.selector.filterByText(this.filteredText);
    }
  }
}
