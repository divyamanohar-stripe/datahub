import Component from '@ember/component';
import ComputedProperty from '@ember/object/computed';
import { set, get, getProperties, computed } from '@ember/object';
import { ComplianceFieldIdValue, idTypeFieldHasLogicalType, isTagIdType } from 'wherehows-web/constants';
import {
  IComplianceChangeSet,
  IComplianceFieldFormatOption,
  IComplianceFieldIdentifierOption,
  IDropDownOption
} from 'wherehows-web/typings/app/dataset-compliance';
import { IComplianceDataType } from 'wherehows-web/typings/api/list/compliance-datatypes';
import { action } from 'ember-decorators/object';
import { IComplianceEntity } from 'wherehows-web/typings/api/datasets/compliance';
import { arrayFilter } from 'wherehows-web/utils/array';
import { IdLogicalType } from 'wherehows-web/constants/datasets/compliance';

/**
 * Constant definition for an unselected field format
 * @type {IDropDownOption<null>}
 */
const unSelectedFieldFormatValue: IDropDownOption<null> = {
  value: null,
  label: 'Select Field Format...',
  isDisabled: true
};

/**
 * Creates a filter function that excludes options that are already included in other field tags
 * @param {IComplianceEntity.identifierType} currentTagId
 * @return {(fieldIdTypeTags: Array<IComplianceEntity["identifierType"]>) => ({ value }: IComplianceFieldIdentifierOption) => boolean}
 */
const resolvedOptionsFilterFn = (currentTagId: IComplianceEntity['identifierType']) => (
  fieldIdTypeTags: Array<IComplianceEntity['identifierType']>
) => ({ value }: IComplianceFieldIdentifierOption): boolean =>
  !fieldIdTypeTags.includes(value) || value === currentTagId;

export default class DatasetComplianceFieldTag extends Component {
  tagName = 'tr';

  /**
   * Describes action interface for `onTagIdentifierTypeChange` action
   * @memberof DatasetComplianceFieldTag
   */
  onTagIdentifierTypeChange: (tag: IComplianceChangeSet, option: { value: ComplianceFieldIdValue | null }) => void;

  /**
   * Describes the parent action interface for `onTagLogicalTypeChange`
   */
  onTagLogicalTypeChange: (tag: IComplianceChangeSet, value: IComplianceChangeSet['logicalType']) => void;

  /**
   * Describes the interface for the parent action `onTagValuePatternChange`
   */
  onTagValuePatternChange: (tag: IComplianceChangeSet, pattern: string) => string | void;

  /**
   * Describes the parent action interface for `onTagOwnerChange`
   */
  onTagOwnerChange: (tag: IComplianceChangeSet, nonOwner: boolean) => void;

  /**
   * References the change set item / tag to be added to the parent field
   * @type {IComplianceChangeSet}
   * @memberof DatasetComplianceFieldTag
   */
  tag: IComplianceChangeSet;

  /**
   * Flag indicating that the parent field has a single tag associated
   * @type {boolean}
   * @memberof DatasetComplianceFieldTag
   */
  parentHasSingleTag: boolean;

  /**
   * Stores the value of error result if the valuePattern is invalid
   * @type {string}
   */
  valuePatternError: string = '';

  /**
   * List of identifierTypes for the parent field
   * @type {Array<IComplianceEntity['identifierType']>}
   * @memberof DatasetComplianceFieldTag
   */
  fieldIdentifiers: Array<IComplianceEntity['identifierType']>;

  /**
   * Reference to the compliance data types
   * @type {Array<IComplianceDataType>}
   */
  complianceDataTypes: Array<IComplianceDataType>;

  /**
   * Reference to the full list of options for the identifierType tag property IComplianceFieldIdentifierOption
   * @type {Array<IComplianceFieldIdentifierOption>}
   */
  complianceFieldIdDropdownOptions: Array<IComplianceFieldIdentifierOption>;

  /**
   * Build the drop down options available for this tag by filtering out options that are not applicable /available for this tag
   * @type {ComputedProperty<Array<IComplianceFieldIdentifierOption>>}
   * @memberof DatasetComplianceFieldTag
   */
  fieldIdDropDownOptions = computed('hasSingleTag', 'fieldIdentifiers', function(
    this: DatasetComplianceFieldTag
  ): Array<IComplianceFieldIdentifierOption> {
    const { parentHasSingleTag, fieldIdentifiers, complianceFieldIdDropdownOptions: allOptions, tag } = getProperties(
      this,
      ['parentHasSingleTag', 'fieldIdentifiers', 'complianceFieldIdDropdownOptions', 'tag']
    );

    if (!parentHasSingleTag) {
      const thisTagIdentifierType = get(tag, 'identifierType');
      const noneOption = allOptions.findBy('value', ComplianceFieldIdValue.None);
      // if the parent field does not have a single tag, then no field can be tagged as ComplianceFieldIdValue.None
      const options = allOptions.without(noneOption!);

      return arrayFilter(resolvedOptionsFilterFn(thisTagIdentifierType)(fieldIdentifiers))(options);
    }

    return allOptions;
  });

  /**
   * Flag indicating that this tag has an identifier type of idType that is true
   * @type {ComputedProperty<boolean>}
   * @memberof DatasetComplianceFieldTag
   */
  isIdType: ComputedProperty<boolean> = computed('tag.identifierType', 'complianceDataTypes', function(
    this: DatasetComplianceFieldTag
  ): boolean {
    const { tag, complianceDataTypes } = getProperties(this, ['tag', 'complianceDataTypes']);
    return isTagIdType(complianceDataTypes)(tag);
  });

  /**
   * A list of field formats that are determined based on the tag identifierType
   * @type ComputedProperty<Array<IComplianceFieldFormatOption>>
   * @memberof DatasetComplianceFieldTag
   */
  fieldFormats: ComputedProperty<Array<IComplianceFieldFormatOption>> = computed('isIdType', function(
    this: DatasetComplianceFieldTag
  ): Array<IComplianceFieldFormatOption> {
    const identifierType = get(this, 'tag')['identifierType'] || '';
    const { isIdType, complianceDataTypes } = getProperties(this, ['isIdType', 'complianceDataTypes']);
    const complianceDataType = complianceDataTypes.findBy('id', identifierType);
    let fieldFormatOptions: Array<IComplianceFieldFormatOption> = [];

    if (complianceDataType && isIdType) {
      const supportedFieldFormats = complianceDataType.supportedFieldFormats || [];
      const supportedFormatOptions = supportedFieldFormats.map(format => ({ value: format, label: format }));

      return supportedFormatOptions.length
        ? [unSelectedFieldFormatValue, ...supportedFormatOptions]
        : supportedFormatOptions;
    }

    return fieldFormatOptions;
  });

  /**
   * Determines if the CUSTOM input field should be shown for this row's tag
   * @type {ComputedProperty<boolean>}
   */
  showCustomInput = computed('tag.logicalType', function(this: DatasetComplianceFieldTag): boolean {
    const { logicalType } = get(this, 'tag');
    return logicalType === IdLogicalType.Custom;
  });

  /**
   * Checks if the field format / logical type for this tag is missing, if the field is of ID type
   * @type {ComputedProperty<boolean>}
   * @memberof DatasetComplianceFieldTag
   */
  isTagFormatMissing = computed('isIdType', 'tag.logicalType', function(this: DatasetComplianceFieldTag): boolean {
    return get(this, 'isIdType') && !idTypeFieldHasLogicalType(get(this, 'tag'));
  });

  /**
   * Sets the value of the pattern error string after p
   * @param {string} errorString
   */
  setPatternErrorString(errorString: string = '') {
    set(this, 'valuePatternError', errorString.replace('SyntaxError: ', ''));
  }

  /**
   * Handles UI changes to the tag identifierType
   * @param {{ value: ComplianceFieldIdValue }} { value }
   */
  @action
  tagIdentifierTypeDidChange(this: DatasetComplianceFieldTag, { value }: { value: ComplianceFieldIdValue | null }) {
    const onTagIdentifierTypeChange = get(this, 'onTagIdentifierTypeChange');

    if (typeof onTagIdentifierTypeChange === 'function') {
      onTagIdentifierTypeChange(get(this, 'tag'), { value });
    }
  }

  /**
   * Handles the updates when the tag's logical type changes on this tag
   * @param {(IComplianceChangeSet['logicalType'])} value contains the selected drop-down value
   */
  @action
  tagLogicalTypeDidChange(this: DatasetComplianceFieldTag, { value }: { value: IComplianceChangeSet['logicalType'] }) {
    const onTagLogicalTypeChange = get(this, 'onTagLogicalTypeChange');

    if (typeof onTagLogicalTypeChange === 'function') {
      onTagLogicalTypeChange(get(this, 'tag'), value);
    }
  }

  /**
   * Handles the nonOwner flag update on the tag
   * @param {boolean} nonOwner
   */
  @action
  tagOwnerDidChange(this: DatasetComplianceFieldTag, nonOwner: boolean) {
    // inverts the value of nonOwner, toggle is shown in the UI as `Owner` i.e. not nonOwner
    get(this, 'onTagOwnerChange')(get(this, 'tag'), !nonOwner);
  }

  /**
   * Invokes the parent action on user input for value pattern
   * If an exception is thrown, valuePatternError is updated with string value
   * @param {string} pattern user input string
   */
  @action
  tagValuePatternDidChange(this: DatasetComplianceFieldTag, pattern: string) {
    try {
      const valuePattern = get(this, 'onTagValuePatternChange')(get(this, 'tag'), pattern);

      if (valuePattern) {
        //clear pattern error
        this.setPatternErrorString();
      }
    } catch (e) {
      this.setPatternErrorString(e.toString());
    }
  }
}
