// backend_service/src/utils/fieldSecurity.utils.js
class FieldSecurity {
  constructor() {
    // Fields that should NEVER be updatable by users (even admins should be cautious)
    this.immutableFields = [
      "_id",
      "id",
      "__v",
      "createdAt",
      "updatedAt",
      "slug", // Auto-generated, shouldn't be manually updated
    ];

    // Fields that only internal system can update (not via API)
    this.systemManagedFields = [
      "password_reset_token",
      "password_reset_expires",
      "account_verification_otp",
      "account_verification_otp_expires",
      "password_change_at",
      "last_login",
    ];

    // Sensitive fields that should be hidden from API responses
    this.sensitiveFields = [
      "password",
      "password_reset_token",
      "password_reset_expires",
      "account_verification_otp",
      "account_verification_otp_expires",
    ];

    // Fields that require special permissions to update
    this.adminOnlyFields = [
      "role",
      "is_admin",
      "status",
      "is_account_verified",
    ];

    // Fields that regular users can update themselves
    this.userUpdatableFields = [
      "first_name",
      "last_name",
      "gender",
      "phone",
      "location",
      "language",
      "about_me",
      "topics_of_interest",
      "profile_image",
    ];
  }

  /**
   * Filter out fields that are not allowed to be updated
   * @param {Object} updateData - The incoming update data
   * @param {Object} options - Options for filtering
   * @param {boolean} options.isAdmin - Whether the user is an admin
   * @param {Array} options.allowedFields - Specific fields to allow (optional)
   * @returns {Object} - Filtered update data
   */
  filterUpdateData(updateData, options = {}) {
    const { isAdmin = false, allowedFields = null } = options;

    const filteredData = {};

    Object.keys(updateData).forEach((field) => {
      // Check if field is explicitly allowed
      if (allowedFields && allowedFields.includes(field)) {
        filteredData[field] = updateData[field];
        return;
      }

      // Check immutable fields (never allowed)
      if (this.immutableFields.includes(field)) {
        return;
      }

      // Check system-managed fields (never allowed via API)
      if (this.systemManagedFields.includes(field)) {
        return;
      }

      // Check admin-only fields
      if (this.adminOnlyFields.includes(field)) {
        if (isAdmin) {
          filteredData[field] = updateData[field];
        }
        return;
      }

      // Allow user-updatable fields
      if (this.userUpdatableFields.includes(field)) {
        filteredData[field] = updateData[field];
      }

      // Any other fields are rejected by default
    });

    return filteredData;
  }

  /**
   * Remove sensitive fields from user object
   * @param {Object} user - The user object from database
   * @param {Object} options - Options for filtering
   * @param {boolean} options.isAdmin - Whether to include admin-only fields
   * @returns {Object} - Sanitized user object
   */
  sanitizeUser(user, options = {}) {
    const { isAdmin = false } = options;

    if (!user || typeof user !== "object") {
      return user;
    }

    // Convert Mongoose document to plain object if needed
    const userObj = user.toObject ? user.toObject() : { ...user };

    // Always remove sensitive fields
    this.sensitiveFields.forEach((field) => {
      delete userObj[field];
    });

    // If not admin, remove admin-only fields from response
    if (!isAdmin) {
      this.adminOnlyFields.forEach((field) => {
        delete userObj[field];
      });

      // Also remove some system fields from regular users
      delete userObj.last_login;
      delete userObj.password_change_at;
    }

    return userObj;
  }

  /**
   * Validate if a specific field can be updated
   * @param {string} field - Field name to check
   * @param {Object} options - Options for validation
   * @returns {boolean} - Whether the field can be updated
   */
  canUpdateField(field, options = {}) {
    const { isAdmin = false } = options;

    if (
      this.immutableFields.includes(field) ||
      this.systemManagedFields.includes(field)
    ) {
      return false;
    }

    if (this.adminOnlyFields.includes(field)) {
      return isAdmin;
    }

    return this.userUpdatableFields.includes(field);
  }

  /**
   * Get list of allowed fields for update based on user role
   * @param {Object} options - Options for getting allowed fields
   * @returns {Array} - Array of allowed field names
   */
  getAllowedUpdateFields(options = {}) {
    const { isAdmin = false } = options;

    const allowedFields = [...this.userUpdatableFields];

    if (isAdmin) {
      allowedFields.push(...this.adminOnlyFields);
    }

    return allowedFields;
  }
}

// Create singleton instance
const fieldSecurity = new FieldSecurity();

module.exports = fieldSecurity;
